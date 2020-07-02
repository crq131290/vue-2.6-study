/* @flow */
/**
 * 格式化scopedSlots
 * 返回一个map对应slot name和包装函数scope=>fn(scope) 
 * fn组件内部定义的render函数
 */
export function normalizeScopedSlots (
  slots: { [key: string]: Function } | void,
  normalSlots: { [key: string]: Array<VNode> }
): any {
  let res
  if (!slots) {
    res = {}
  } else if (slots._normalized) {//以经格式化之后的
    return slots
  } else {
    // 生成一个map {key:scope=>{fn(scope)}} slots[key]指的是组件内部定义的render函数 这里的scope是我们手动传入的
    // eg：<div slot-scope="scope">{{scope.a}}</div>
    // rendercreateElement('div',context.data,[context.scopedSlots.default({a:1234})])//scoped指的是{a:1234} 
    // context.scopedSlots.default在内部调用render函数，返回vnode
    // 最终返回的res是一个 map
    res = {}
    for (const key in slots) {
      if (slots[key]) {
        res[key] = normalizeScopedSlot(slots[key])
      }
    }
  }
  // expose normal slots on scopedSlots
  for (const key in normalSlots) {
    if (!(key in res)) {
      res[key] = proxyNormalSlot(normalSlots, key)
    }
  }
  res._normalized = true
  return res
}

function normalizeScopedSlot(fn: Function) {
  return scope => {
    const res = fn(scope)//传入的render函数 所以返回vnode
    return Array.isArray(res) ? res : res ? [res] : res
  }
}

function proxyNormalSlot(slots, key) {
  return () => slots[key]
}
