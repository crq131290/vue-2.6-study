/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always//保证父组件watcher先更新
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because//用户自定义watcher在渲染wathcer之前先执行
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,//父组件watcher.run执行时，子组件被删除了，该watcher可跳过
  //    its watchers can be skipped.
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (index = 0; index < queue.length; index++) {//依次调用watcher.run方法
    watcher = queue[index]
    // 如果watcher定义了before的配置，则优先执行before方法
    if (watcher.before) {
      watcher.before()
    }
    id = watcher.id
    has[id] = null
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()
// 重置恢复状态，清空队列
  resetSchedulerState()

  // call component updated and activated hooks
   // 调用update和activated钩子
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id//每个wathcer的标识
  if (has[id] == null) {//当watcher添加至队列中时，则不再重复添加，保证每个watcher只有只执行一次
    has[id] = true
    if (!flushing) {//flushing表示 flushSchedulerQueue执行中
      queue.push(watcher)//没有执行时直接将watcher添加至queue当中
    } else {//当flushSchedulerQueue执行中时，则需要更watcher.id来决定watcher执行的位置，因为在queue执行过程中
      // 是按watcher.id从小到大排序，依次执行的，原因三点
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    if (!waiting) {//waiting 当flushSchedulerQueue执行完毕时 waiting为false，否则一直是true 意味着现在还没刷新，快都放到这个queue当中
      // flushSchedulerQueue每执行玩一次，waiting就变为false，变为false，就会执行nextTick(flushSchedulerQueue)，
      // 所以这里就保证了一个缓冲效果
      // 在当前执行的任务序列没完成时，始终在当前接受watcher放置在一个queue当中，
      // 当当前的任务完成后，则将新的队列推入nextTick中去排队执行
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        flushSchedulerQueue()
        return
      }
      // 本质是利用事件循环的微任务队列实现异步更新 在nextTick中缓存多个数据处理过程，等到下一个tick时，再去执行更新操作
      nextTick(flushSchedulerQueue)
    }
  }
}
