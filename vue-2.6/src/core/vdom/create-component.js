/* @flow */

import VNode from './vnode'
import { resolveConstructorOptions } from 'core/instance/init'
import { queueActivatedComponent } from 'core/observer/scheduler'
import { createFunctionalComponent } from './create-functional-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject
} from '../util/index'

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData
} from './helpers/index'

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent
} from '../instance/lifecycle'

import {
  isRecyclableComponent,
  renderRecyclableComponentTemplate
} from 'weex/runtime/recycle-list/render-component-template'

// inline hooks to be invoked on component VNodes during patch
const componentVNodeHooks = {
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,//当前实例化的vnode
        activeInstance//实例化当前组件的父组件parent
      )
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },

  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },

  insert (vnode: MountedComponentVNode) {
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },

  destroy (vnode: MountedComponentVNode) {
    const { componentInstance } = vnode
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy()
      } else {
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}

const hooksToMerge = Object.keys(componentVNodeHooks)

export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  if (isUndef(Ctor)) {
    return
  }
  // 获取基础构造器
  const baseCtor = context.$options._base

  // plain options object: turn it into a constructor
  // 如果是Ctor是个普通对象则表明是传入的是otpions，将options转化成子类构造器 通过Vue.extend方法
  if (isObject(Ctor)) {//options转换成子类构造器 
    Ctor = baseCtor.extend(Ctor)
  }


  // if at this stage it's not a constructor or an async component factory,
  // reject.
  // 如果Ctor不是一个函数 （子类构造器or异步组件工厂函数） 直接返回
  if (typeof Ctor !== 'function') {//不是一个构造器时直接返回
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    return
  }

  /**
   * 来到这里一定是一个Ctor一定是一个函数，如果是extend生成的的子类会有cid属性，否则就是异步组件工厂函数
   * Vue.component第二个参数如果不是普通的options，则不会调用Vue.extend方法创建子类构造器
   * 异步组件的处理方式
   */
  // async component
  let asyncFactory
  if (isUndef(Ctor.cid)) {
    // 所以没有cid表明这个ctor不是通过extend方法生成的构造器，表明这是一个异步组件
    asyncFactory = Ctor
    /**
     * 异步工厂函数分三大类 普通函数包含异步操作，Promise加载，高级异步组件
     * 三者的共同点是都饱和了一个异步操作，Vue根据三种情况去在不同的地方去触发resolve 即指定resolve的点不同 
     * resolve是在 resolveAsyncComponent中定义的
     * function(resolve,rej){
        setTimeout(()=>{
          resolve({
            template:`<div>
              在未来会渲染的组件
              </div>`
          })
        },1000)
      }
     */
    // 最终处理的结果是在asyncFactory挂载一个resolved属性指向实例的构造器（只有在resolve触发后，resolved属性才会挂载），并将构造器返回 
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor, context)//asyncFactory.resolved
    if (Ctor === undefined) { 
      //Ctor为空，即resolve没有触发，resolved尚未挂挂载成功，此时就返回一个占位符vnode
      // 这个vnode包含渲染实际vnode的所有参数存放在 asyncFactory和asyncMeta上
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }
// data指的_c中的data参数 {attrs,props,on...}
  data = data || {}

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  // 混入全局的options在子类构造器上
  resolveConstructorOptions(Ctor)

  // transform component v-model data into props & events
  if (isDef(data.model)) {
    // 转化v-model的绑定事件和属性 默认input和value  自定义v-model的关键
    transformModel(Ctor.options, data)
  }

  // 关于props 和attrs  普通的props会被合并到attrs当中，特殊的prop会独立存在于props当中（v-model）=>props:{value:xxx}
  // extract props
  // 提取props数据 并将位于data中对应的prop or attr给删除掉
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  // functional component
  // 函数式组件
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)//返回vnode
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  // 监听事件
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  // 原生事
  data.on = data.nativeOn

  if (isTrue(Ctor.options.abstract)) {
    // 抽象组件 只保留 props listeners slot,
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  // install component management hooks onto the placeholder node
  // 这里比较重要，在数据对象data中加入了四个钩子 "init"，"prepatch"，"insert"，"destroy"
  // 其中init钩子会在创建placeholder时==>发现是组件==>组件实例化==>调用init方法 
  // 也就解释了为什么在实际创placeholder的虚拟节点时，会有这么个init钩子可供调用
  installComponentHooks(data)
  // 返回一个占位vnode eg: vue-component-1-test 
  // return a placeholder vnode
  const name = Ctor.options.name || tag

  // new VNode到底做了啥 
  // 就是用js标记一个obj表示dom对象
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }

  return vnode
}

export function createComponentInstanceForVnode (
  vnode: any, // we know it's MountedComponentVNode but flow doesn't
  parent: any, // activeInstance in lifecycle state
): Component {
  const options: InternalComponentOptions = {
    _isComponent: true,//实例化组件
    _parentVnode: vnode,//实例化当前组件的vnode ，并非parent的vnode
    parent//父组件的实例
  }
  // check inline-template render functions
  const inlineTemplate = vnode.data.inlineTemplate
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }
  return new vnode.componentOptions.Ctor(options)
}

function installComponentHooks (data: VNodeData) {
  const hooks = data.hook || (data.hook = {})
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i]
    const existing = hooks[key]
    const toMerge = componentVNodeHooks[key]
    if (existing !== toMerge && !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge
    }
  }
}

function mergeHook (f1: any, f2: any): Function {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b)
    f2(a, b)
  }
  merged._merged = true
  return merged
}

// transform component v-model info (value and callback) into
// prop and event handler respectively.
function transformModel (options, data: any) {
  const prop = (options.model && options.model.prop) || 'value'
  const event = (options.model && options.model.event) || 'input'
  ;(data.props || (data.props = {}))[prop] = data.model.value
  const on = data.on || (data.on = {})
  const existing = on[event]
  const callback = data.model.callback
  if (isDef(existing)) {
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      on[event] = [callback].concat(existing)
    }
  } else {
    on[event] = callback
  }
}
