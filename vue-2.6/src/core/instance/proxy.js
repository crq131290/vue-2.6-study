/* not type checking this file because flow doesn't play well with Proxy */

import config from 'core/config'
import { warn, makeMap, isNative } from '../util/index'

let initProxy

if (process.env.NODE_ENV !== 'production') {
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  )

  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }

  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }

  const hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy)

  if (hasProxy) {
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    config.keyCodes = new Proxy(config.keyCodes, {
      set (target, key, value) {
        if (isBuiltInModifier(key)) {
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          target[key] = value
          return true
        }
      }
    })
  }
/**
 * 查看vm实例是否拥有某个属性
 * eg:in ，with会被has给拦截
 * 这个地方主要是检查访问__renderProxy上属性是否合法，不合法提示个异常
 * hasHandler 触发条件是在 vue渲染时触发的，
 * Vue.prototype._render = function () {
      // 调用vm._renderProxy
      vnode = render.call(vm._renderProxy, vm.$createElement);
  }
  _render函数是使用with 访问vm._renderProxy，也就会触发hasHandler
  hasHandler主要的目的是为了检测模板中的变量名称是否合法，是否包含_,$这类vue内部变量命名名称，
  这里就解释了为什么data中以不允许_,$为开头的变量
 */
  const hasHandler = {
    has (target, key) {
      const has = key in target 
      // isAllowed用来判断模板上出现的变量是否合法。

      // allowedGlobals 模板中允许出现的非vue实例定义的变量
      const isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))
      if (!has && !isAllowed) {
        // _和$开头的变量不允许出现在定义的数据中，因为他是vue内部保留属性的开头。
        // warnReservedPrefix警告不能以$ _开头的变量
        // warnNonPresent 警告模板出现的变量在vue实例中未定义
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return has || !isAllowed
    }
  }

  /**
   * 返回target 中对应的属性值，
   * 如果访问属性是string 且不再target则则报错提醒
   */
  const getHandler = {
    get (target, key) {
      if (typeof key === 'string' && !(key in target)) {
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return target[key]
    }
  }

  initProxy = function initProxy (vm) {
    if (hasProxy) {
      // determine which proxy handler to use
      const options = vm.$options
      const handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
