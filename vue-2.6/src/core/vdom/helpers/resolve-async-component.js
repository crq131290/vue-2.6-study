/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol,
  isPromise
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'

function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {//import方式处理 将default的值取出来
    comp = comp.default
  }
  //最终保证返回的都是构造器，如果是对象则使用extend方法返回子类构造器
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}

export function resolveAsyncComponent (
  factory: Function,//加载异步组件的函数 ，我们调用Vue.component('test',fn)
  baseCtor: Class<Component>,
  context: Component
): Class<Component> | void {
  // 
  if (isTrue(factory.error) && isDef(factory.errorComp)) {//高级异步组件的错误组件
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {//异步组件工厂函数再次执行时，直接返回已生成的resolved（前提resolved以生成）//走正常渲染组件流程
    return factory.resolved
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {//高级异步组件的londing组件
    return factory.loadingComp
  }

  if (isDef(factory.contexts)) {
    // already pending
    factory.contexts.push(context)
  } else {
    // 在工厂函数上挂载当前实例context vm
    const contexts = factory.contexts = [context]
    let sync = true
    
    // 定义 forceRender方法 对contexts中的vm实例调用$forceUpdate进行强制渲染
    const forceRender = (renderCompleted: boolean) => {
      // 闭包引用contexts 强制渲染
      for (let i = 0, l = contexts.length; i < l; i++) {
        contexts[i].$forceUpdate()
      }

      if (renderCompleted) {//渲染完成，清空contexts
        contexts.length = 0
      }
    }
// 定义resolve 对应工厂函数中传入的resolve参数，表明异步操作已完成
// 异步操作中调用的resolve方法，接受一个参数
    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved
      // 
      factory.resolved = ensureCtor(res, baseCtor)//返回的是构造器
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        // 强制渲染 这里用的是闭包原理
        forceRender(true)
      }
    })
// reject时走的逻辑
    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender(true)
      }
    })

    const res = factory(resolve, reject)//factory函数包含异步操作，首次被调用时返回的结果类型不同 
    /**
     * 工厂函数返回的res是undefined
       如果使用webpack 的（）=>import 则返回的是一个含有then的对象 触发resolve的方式不同而已 
       高级异步组件：高级异步组件定义是一个函数，返回一个对象，对象包含一个component：对应的是一个异步操作 (还有些别的属性，可以见官网))
     */

    if (isObject(res)) {
      // 高级组件处理
      if (isPromise(res)) {//返回的promise 采用then方法指定resolve和reject 
        // () => Promise ()=>import(xxx)
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      } else if (isPromise(res.component)) {//高级异步组件 component:import(xxxx)
        res.component.then(resolve, reject)//指定resolve 和reject
        /**
         * 下面是针对高级异步组件别的属性的配置
         */
        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          if (res.delay === 0) {
            factory.loading = true
          } else {
            setTimeout(() => {
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender(false)
              }
            }, res.delay || 200)
          }
        }

        if (isDef(res.timeout)) {
          setTimeout(() => {
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // return in case resolved synchronously
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
