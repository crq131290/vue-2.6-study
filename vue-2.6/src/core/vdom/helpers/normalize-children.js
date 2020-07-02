/* @flow */

import VNode, { createTextVNode } from 'core/vdom/vnode'
import { isFalse, isTrue, isDef, isUndef, isPrimitive } from 'shared/util'

// The template compiler attempts to minimize the need for normalization by
// statically analyzing the template at compile time.
//
// For plain HTML markup, normalization can be completely skipped because the
// generated render function is guaranteed to return Array<VNode>. There are
// two cases where extra normalization is needed:
/**
 * 对于纯的html标签来说，可以跳过格式化，因为generated render函数始终都会返回vnode数组
 * 一下两种二外清空需要格式化
 */

// 1. When the children contains components - because a functional component
// may return an Array instead of a single root. In this case, just a simple
// normalization is needed - if any child is an Array, we flatten the whole
// thing with Array.prototype.concat. It is guaranteed to be only 1-level deep
// because functional components already normalize their own children.
/**
 * 当组件中包含组件时，
 * 需额外处理，因为函数组件返回的可能是一个数组，而非一个根组件
 * 这种情况需要将children flat一下
 */
export function simpleNormalizeChildren (children: any) {
  for (let i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      return Array.prototype.concat.apply([], children)//concat 可将children直接flat 平坦化，即将二维数组变成一维数组，
    }
  }
  return children
}

// 2. When the children contains constructs that always generated nested Arrays,
// e.g. <template>, <slot>, v-for, or when the children is provided by user
// with hand-written render functions / JSX. In such cases a full normalization
// is needed to cater to all possible types of children values.
/**
 * <template>标签会创建嵌套数组 ==><template>3</template> ==>[[_v("3")]] 
 * v-for 遍历嵌套结构时 v-for="item in [[1,2],[3,4]]"
 * 当子组件始终包含嵌套数组、或者自定义render函数时 ，则需要完全格式化，保证每个child都可用
 */
export function normalizeChildren (children: any): ?Array<VNode> {
  return isPrimitive(children)//基本类型？
    ? [createTextVNode(children)]//返回一个TextVNode
    : Array.isArray(children)//数组
      ? normalizeArrayChildren(children)
      : undefined
}
/**
 * 小结：
 * 1.凡是纯html标签则无需格式化
 * 2.包含子组件，简单格式化，返回一维vnode数组
 * 3.生成嵌套数组结构或自定义render则需完全格式化
 * 4.完全格式化就是递归每个子节点，最终返回一个一维vnode数组
 */

function isTextNode (node): boolean {
  return isDef(node) && isDef(node.text) && isFalse(node.isComment)
}
/**
 * 递归调用，将嵌套结构返回生成一维数组，同时对相邻textNode进行合并
 * 最终返回的是一个一维文本节点数组
 */
function normalizeArrayChildren (children: any, nestedIndex?: string): Array<VNode> {
  const res = []
  let i, c, lastIndex, last
  for (i = 0; i < children.length; i++) {
    c = children[i]
    if (isUndef(c) || typeof c === 'boolean') continue
    lastIndex = res.length - 1
    last = res[lastIndex]
    //  nested
    if (Array.isArray(c)) {//c是数组
      if (c.length > 0) {
        c = normalizeArrayChildren(c, `${nestedIndex || ''}_${i}`)//递归调用,传入嵌套层数
        // merge adjacent text nodes
        if (isTextNode(c[0]) && isTextNode(last)) {//合并textnode
          res[lastIndex] = createTextVNode(last.text + (c[0]: any).text)
          c.shift()//去除c[0]
        }
        res.push.apply(res, c)//将一维化的c添加至res当中，进行后续循环
      }
    } else if (isPrimitive(c)) {//c是基础类型
      if (isTextNode(last)) {//根据last是否是文本节点来处理当前的c，即相邻的文本节点进行合并成同一个文本节点，否则新增。
        // merge adjacent text nodes
        // this is necessary for SSR hydration because text nodes are
        // essentially merged when rendered to HTML strings
        res[lastIndex] = createTextVNode(last.text + c)
      } else if (c !== '') {
        // convert primitive to vnode
        res.push(createTextVNode(c))
      }
    } else {//c是vnode时
      if (isTextNode(c) && isTextNode(last)) {//合并文本节点
        // merge adjacent text nodes
        res[lastIndex] = createTextVNode(last.text + c.text)
      } else {
        // 嵌套结构 设置 key属性后，加入res中
        // default key for nested array children (likely generated by v-for)
        if (isTrue(children._isVList) &&
          isDef(c.tag) &&
          isUndef(c.key) &&
          isDef(nestedIndex)) {
          c.key = `__vlist${nestedIndex}_${i}__`
        }
        res.push(c)
      }
    }
  }
  return res
}
