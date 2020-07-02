/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0
/**
 * 
 * 实现 _init方法
 */
export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation 
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
     // 如果是子组件
      initInternalComponent(vm, options)
    } else {
      //策略合并
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),//构造函数 components directives filters _base 
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')
    // created在$mount之前

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
      
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode//当前实例的vnode
  opts.parent = options.parent//当前实例的parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData//父组件传递过来的props,子组件需要在props中对应声明
  opts._parentListeners = vnodeComponentOptions.listeners//父组件上绑定的listeners 就是@xxx="xxx"之类的
  opts._renderChildren = vnodeComponentOptions.children//指的是组件中包含的内容<test>asdasd</test> eg:asdasd 就会出现在test的children当中，slot
  opts._componentTag = vnodeComponentOptions.tag//组件的tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options 
  // 有super属性，说明Ctor是Vue.extend构建的子类
  if (Ctor.super) {
    //递归获取父类上的 options给==>superOptions 表示父类options 
    const superOptions = resolveConstructorOptions(Ctor.super)

    const cachedSuperOptions = Ctor.superOptions 
    // 将自身携带的 superOptions 和递归得到的父类superOptions进行比较
    // 如果父类的options没有发生变化则直接返回options
    // 有变化则进行合并变化之后的options
    if (superOptions !== cachedSuperOptions) {
      // 例如执行了Vue.mixin方法，这时候就需要把"自身"的superOptions属性替换成最新的
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 之后检查是否"自身"的options是否发生变化
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        // 如果”自身“有新添加的options，则把新添加的options属性添加到Ctor.extendOptions属性上
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 调用mergeOptions方法合并"父类"构造器上的options和”自身“上的extendOptions
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  // 直接 new Vue ,就是基础构造器 Vue出来的则直接返回options
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
