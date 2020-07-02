/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher;//静态属性target
  id: number;
  subs: Array<Watcher>;

  constructor () {//
    this.id = uid++
    this.subs = []//subs中存储watcher实例
  }

  addSub (sub: Watcher) {//增加watcher
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {//删除watcher
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {//在watcher中添加dep
      Dep.target.addDep(this)
    }
  }

  notify () {//dep通知方法，将subs中的wathcer.update方法依次执行
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
