/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
export function createElement (
  context: Component,//vm实例
  tag: any,//标签
  data: any,//子节点的数据,属性等
  children: any,//子节点
  normalizationType: any,//格式化children方式
  alwaysNormalize: boolean//编译器生成的无需格式化，自定义需要格式化
): VNode | Array<VNode> {
   
//data是一个数组或者简单类型的值，意味着data没有传入，传递的是children，而children上是normalizationType
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {//选择使用编译生成的render还是自定义的render
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)//生成vnode
}
/**
 * 创建vnode
 */
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  /**
   * 由于可以自定义render函数，所以需要对用户输入的进行校验
   * 1.响应式对象不可作为节点的属性 ，即data不能是响应式对象
   * 2.key必须是string/number
   * 3.
   */
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    return createEmptyVNode() //返回注释节点
  }
  // object syntax in v-bind
  // 动态组件:is 的处理，
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode() //返回注释节点
  }
  // warn against non-primitive key
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // support single function children as default scoped slot
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  /**
   * 扁平化处理
   */
  if (normalizationType === ALWAYS_NORMALIZE) {
    // 用户自定义render函数时 ，递归调用使其一维化
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    // 当children中有数组时，将其一维化
    children = simpleNormalizeChildren(children)
  }
  //得到的children都是一维类数组
/**
 * 使用children生成vnode
 * 组件生成的vnode是createComponent方法返回的vnode
 * 静态标签的vnode采用new VNode生成
 */
  let vnode, ns
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    if (config.isReservedTag(tag)) {
      // 判断是否是平台所持有的tag web端就是html和svg标签的判断
      // 是的话就采用new VNode创建vnode
      // platform built-in elements
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component 组件就调用createComponent，返回vnode
      // 这里对组件进行生产vnode ，全局注册组件和局部组件构造器的查找方式不同，两者存储在不同的地方 
      // 详见resolveAsset方法，包括对template中大消息处理
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // 如果即不是平台的静态标签也不是注册的component 
      // 则调用new VNode创建未知标签的vnode
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // 如果tag是一个Component类型，则调用createComponent创建一个组件vnode
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    //生成vnode数组直接返回
    return vnode
  } else if (isDef(vnode)) {
    //单个vnode则处理一下
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    // 没有生成vnode则返回一个注释vnode
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
