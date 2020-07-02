/* @flow */

import VNode, { cloneVNode } from './vnode'
import { createElement } from './create-element'
import { resolveInject } from '../instance/inject'
import { normalizeChildren } from '../vdom/helpers/normalize-children'
import { resolveSlots } from '../instance/render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import { installRenderHelpers } from '../instance/render-helpers/index'

import {
  isDef,
  isTrue,
  hasOwn,
  camelize,
  emptyObject,
  validateProp
} from '../util/index'

export function FunctionalRenderContext (
  data: VNodeData,//_c的第二个参数，传递给组件的整个数据对象
  props: Object,//所有的props对象
  children: ?Array<VNode>,//Vnode子节点
  parent: Component,//父组件实例
  Ctor: Class<Component>//组件构造器
) {
  const options = Ctor.options
  // ensure the createElement function in functional components
  // gets a unique context - this is necessary for correct named slot check
  let contextVm
  if (hasOwn(parent, '_uid')) {
    // 基于parent为原型的contextVm
    contextVm = Object.create(parent)
    // $flow-disable-line
    contextVm._original = parent
  } else {
    // the context vm passed in is a functional context as well.
    // in this case we want to make sure we are able to get a hold to the
    // real context instance.
    contextVm = parent
    // $flow-disable-line
    parent = parent._original
  }
  const isCompiled = isTrue(options._compiled)
  const needNormalization = !isCompiled

  this.data = data//传递给组件的所有数据
  this.props = props
  this.children = children
  this.parent = parent
  this.listeners = data.on || emptyObject
  this.injections = resolveInject(options.inject, parent)
  this.slots = () => resolveSlots(children, parent) 
  //slots函数 返回的是map化的非作用域插槽，key是slot的名字，value是slot的内容
  // slots().default返回默认插槽内容
  // slot-scope="scope"解析成render函数后生成的是 scopedSlots:default:function(scope){return _c('div',{},[_v(_s(scope.a))])}}
  // 最终的scopedSlots是一个map集合，包含key对应的是slot名称，value对应的上述的function
  Object.defineProperty(this, 'scopedSlots', ({
    enumerable: true,
    get () {
      return normalizeScopedSlots(data.scopedSlots, this.slots())
    }
  }: any))

  // support for compiled functional template
  if (isCompiled) {
    // 带有模板的时候处理
    // exposing $options for renderStatic()
    this.$options = options
    // pre-resolve slots for renderSlot()
    this.$slots = this.slots()
    this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots)
  }
// _c的挂载
  if (options._scopeId) {
    this._c = (a, b, c, d) => {
      const vnode = createElement(contextVm, a, b, c, d, needNormalization)
      if (vnode && !Array.isArray(vnode)) {
        vnode.fnScopeId = options._scopeId
        vnode.fnContext = parent
      }
      return vnode
    }
  } else {
    this._c = (a, b, c, d) => createElement(contextVm, a, b, c, d, needNormalization)
  }
}

installRenderHelpers(FunctionalRenderContext.prototype)

export function createFunctionalComponent (
  Ctor: Class<Component>,//构造器
  propsData: ?Object,//props数据
  data: VNodeData,//_c中的data数据
  contextVm: Component,//当前vue实例，父元素
  children: ?Array<VNode>//子节点
): VNode | Array<VNode> | void {
  // 合并props
  // 在普通组件中，没有被定义为 prop 的 attribute 会自动添加到组件的根元素上，将已有的同名 attribute 进行替换或与其进行智能合并
  // 
  const options = Ctor.options
  const props = {}
  const propOptions = options.props//props中配置项 
  if (isDef(propOptions)) {//如果声明props项，仅仅获取propOptions中规定的内容
    for (const key in propOptions) {
      props[key] = validateProp(key, propOptions, propsData || emptyObject)
    }
  } else {//否则将所有的data.attrs和data.props属性合并到props当中
    if (isDef(data.attrs)) mergeProps(props, data.attrs)
    if (isDef(data.props)) mergeProps(props, data.props)
  }
//这里表明函数式组件即使不声明props也没关系，因为会将传入的attrs props均合并到上下文当中

// 创建函数式组件上下文,由于不实例化，没有this上下文 
  const renderContext = new FunctionalRenderContext(
    data,
    props,
    children,
    contextVm,
    Ctor
  )
    // 生成vnode
  const vnode = options.render.call(null, renderContext._c, renderContext)//函数式组件render函数多一个renderContext对象

  // 返回clone后的vnode 
  if (vnode instanceof VNode) {
    return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options, renderContext)
  } else if (Array.isArray(vnode)) {
    const vnodes = normalizeChildren(vnode) || []
    const res = new Array(vnodes.length)
    for (let i = 0; i < vnodes.length; i++) {
      res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options, renderContext)
    }
    return res
  }
}
/**
 * 在设置fnContext等属性之前clone节点 最终返回clone节点
 * fnContext指的是函数式组件真正的上下文对象
 * clone vnode是为了避免复用节点时fnContext不匹配
 */
function cloneAndMarkFunctionalResult (vnode, data, contextVm, options, renderContext) {
  // #7817 clone node before setting fnContext, otherwise if the node is reused
  // (e.g. it was from a cached normal slot) the fnContext causes named slots
  // that should not be matched to match.
  const clone = cloneVNode(vnode)
  clone.fnContext = contextVm
  clone.fnOptions = options
  if (process.env.NODE_ENV !== 'production') {
    (clone.devtoolsMeta = clone.devtoolsMeta || {}).renderContext = renderContext
  }
  if (data.slot) {
    (clone.data || (clone.data = {})).slot = data.slot
  }
  return clone
}

function mergeProps (to, from) {
  for (const key in from) {
    to[camelize(key)] = from[key]
  }
}
