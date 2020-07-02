###	Vue 源码学习01

#### 1.Vue启动

* Vue的构造函数 src\core\instance\index.js

``` js
function Vue (options) {
    if (process.env.NODE_ENV !== 'production' &&
        !(this instanceof Vue)
       ) {
        warn('Vue is a constructor and should be called with the `new` keyword')
    }
    this._init(options)
}

initMixin(Vue)  //实现 _init方法
//  Vue.prototype._init 
stateMixin(Vue) //设置数据响应式
//  Vue.prototype.$data 
//  Vue.prototype.$props
//  Vue.prototype.$set 
//  Vue.prototype.$delete
//  Vue.prototype.$watch
eventsMixin(Vue)  //实现 $on 和 $once 方法
//  Vue.prototype.$on
//  Vue.prototype.$once
//  Vue.prototype.$off
//  Vue.prototype.$emit
lifecycleMixin(Vue) //实现 _update 、$forceUpdate 、$destroy 方法
//  Vue.prototype._update
//  Vue.prototype.$forceUpdate
//  Vue.prototype.$destroy
renderMixin(Vue) //实现 $nextTick、_render方法
// Vue.prototype.$nextTick
// Vue.prototype._render
// Vue.prototype._o = markOnce
// Vue.prototype._n = toNumber
// Vue.prototype._s = toString
// Vue.prototype._l = renderList
// Vue.prototype._t = renderSlot
// Vue.prototype._q = looseEqual
// Vue.prototype._i = looseIndexOf
// Vue.prototype._m = renderStatic
// Vue.prototype._f = resolveFilter
// Vue.prototype._k = checkKeyCodes
// Vue.prototype._b = bindObjectProps
// Vue.prototype._v = createTextVNode
// Vue.prototype._e = createEmptyVNode
// Vue.prototype._u = resolveScopedSlots
// Vue.prototype._g = bindObjectListeners
```

* 下一个处理Vue 构造函数src/core/index.js

``` js
import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

initGlobalAPI(Vue)

Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    return this.$vnode && this.$vnode.ssrContext
  }
})
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'

export default Vue
```

从``instance/index``中导入已经在原型上挂载了方法和属性后的Vue，然后导入`` initGlobalAPI、isServerRendering、FunctionalRenderContext`` ,再将 Vue作为参数传递给 ``initGlobalAPI`` ,最后在Vue.prototype上挂载 **$isServer、$ssrContext**，并在Vue构造函数上挂载``FunctionalRenderContext`` .

当Vue经过 ``initGlobalAPI`` 

``` js
Vue.config
Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
}
Vue.set = set
Vue.delete = del
Vue.nextTick = nextTick
Vue.observable
Vue.options = {
	components: {
        KeepAlive,
    },
    directives: {},
    filters: {},
    _base: Vue
}
Vue.use
Vue.mixin
Vue.extend
Vue.cid
Vue.component
Vue.directive
Vue.filter

Vue静态方法的挂载处理
```

* web-runtime.js

``` js
//安装平台特有的方法
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

//安装平台特有的指令和组件 model， show，Transition,TransitionGroup
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)


// 定义 __patch__ 和$mount
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

Vue添加web平台所需的配置、指令、组件
添加patch 和$mount
```

这里主要做了三件事

1、覆盖 Vue.config 的属性，将其设置为平台特有的一些方法
2、Vue.options.directives 和 Vue.options.components 安装平台特有的指令和组件
3、在 Vue.prototype 上定义 __patch__ 和 $mount

* 最后一步是入口web-runtime-with-compiler.js

``` js
/**
 * $mount 挂载
 * 带编译器 compiler $mount
 * 这里的 $mount 指的是 /src/platforms/web/runtime/index.js
 * 所以带编译器的版本其实就是改造了$mount 函数，在原来的$mount时，先对render、模板、el=> render进行处理
 * 当正确生成render函数之后，再执行原来的 $mount，
 * 
 */
```

``` js
//缓存来自 web-Runtime上的$mount
const mount = Vue.prototype.$mount
//覆盖$mount方法
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
    if (!options.render) {
    let template = options.template
    if (template) {
      // 转换模板
        ....
    } else if (el) {
      /**
       * 转换el，获取el本身所包裹的内容， innerHTML 是子元素， 
       * */ 
      template = getOuterHTML(el)
    }
    if (template) {
      /**
       * 开始编译 compileToFunctions 编译成渲染函数
       * 最终获取render 和 staticRenderFns
       * 
       */
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns
    }
  }
return mount.call(this, el, hydrating) //调用run-time中的$mount
}
...

Vue.compile = compileToFunctions

覆盖$mount 添加编译器到Vue.compile
```

这个模块总共做了两件事：

1.覆盖$mount方法

2.在Vue上挂载compile 编译器，这里的compileToFunctions就是将template编译成渲染函数。

* 小结
  * Vue.prototype下的属性和方法挂载主要在 core/instance/目录中处理的
  * Vue下的静态方法和挂载主要是在core/global-api目录下处理的
  * web-runtime 主要是添加web平台特有的配置，web-runtime-with-compiler.js
  * compiler时 options中 render,template,el的优先级 render=>template=>el
  * compiler模块在run-time之前调用，用于生成render函数
  * 在webpack环境下使用的是run-time模块，因为在webpack中采用vue-loader将template转换成render函数，所有就不需要compiler模块了

***

#### new Vue(optiosn)

``` js
function Vue (options) {
    if (process.env.NODE_ENV !== 'production' &&
        !(this instanceof Vue)
       ) {
        warn('Vue is a constructor and should be called with the `new` keyword')
    }
    this._init(options)
}
```

* _init方法在 initMixin中实现

  ``` js
  Vue.prototype._init = function (options?: Object) {
      const vm: Component = this
      // a uid
      vm._uid = uid++
  
      // a flag to avoid this being observed
      vm._isVue = true
      // merge options
      if (options && options._isComponent) {
          // 如果是子组件
          initInternalComponent(vm, options)
      } else {
          vm.$options = mergeOptions(
              resolveConstructorOptions(vm.constructor),//构造函数 components directives filters _base 
              options || {},
              vm
          )
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
  
      if (vm.$options.el) {
          vm.$mount(vm.$options.el)
      }
  }
  ```

  根据options._isComponent来处理混合对象还是初始化子组件

  ``` js
  if (options && options._isComponent) {
      // 如果是子组件 组件初始化
      initInternalComponent(vm, options)
  } else {
      合并option并返回新的options 挂载至实例$options
      vm.$options = mergeOptions(
          resolveConstructorOptions(vm.constructor),//构造函数 components directives filters _base 
          options || {},
          vm
      )
  }
  ```

  * resolveConstructorOptions，如果是Vue基础构造器，则直接返回Vue.options ,*是在initGlobalAPI(Vue)定义的*，

  ```js
  function resolveConstructorOptions (Ctor: Class<Component>) {
      let options = Ctor.options 
      // 有super属性，说明Ctor是Vue.extend构建的子类
   
      // 直接 new Vue ,就是基础构造器 Vue出来的则直接返回options
      return options
  }
  ```

  这里```Ctor```其实就是指```vm.constructor``` ==>`Vue` ,所以Ctor.options指的是`Vue.options`

  ``` js
  Vue.options = {
      components: {
          KeepAlive,
          Transition,
          TransitionGroup
      },
      directives: {
          model,
          show
      },
      filters: {},
      _base: Vue
  }
  ```

  如果是采用Vue.extend生成的子类，vm.constructor 上会带有 super，表示继承，此时会先获取父类上的options和自身上缓存的`superOptions`比较是否发生变化，无变化直接返回自身的options，若有变化则将`superOptions`替换成最新的，并且检查自身的`options`是否发生变化，若有变化将新添加变化项加入到自身的 `extendOptions`上，最终采用mergeOptions将父类的options和自身的extendOptions进行合并，返回最终的options。

  ``一言以蔽之就是 没有父亲就返回自己的背包，有父亲就需要将父亲的背包和自己已知父亲的背包比对，最终将父亲的背包和自己的背包合并，返回最新的背包。``

  ``` js
  if (Ctor.super) { extend创建的子类会带有一个静态的super属性
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
  ```

  * ####	策略合并mergeOptions 	

  ``` js
  function mergeOptions (
  parent: Object,
   child: Object,
   vm?: Component
  ): Object {
      if (typeof child === 'function') {
          child = child.options
      }
      /**
     * 格式化Props
     * props三种种格式 [String] | {xxx:String} | {xxx:{type:String}}
     * 最终都format成 {type:val...}的形式 
     */
      normalizeProps(child, vm)
      /**
     * 格式化Inject
     * Inject三种种格式 [String] | {xxx:{}}
     * 最终都format成 { from: val ...}的形式 
     */
      normalizeInject(child, vm)
      /**
     * 格式化Directives
     * 都format成 { bind: def, update: def }的形式 
     */
      normalizeDirectives(child)
  
      if (!child._base) {
          if (child.extends) {
              parent = mergeOptions(parent, child.extends, vm)
          }
          if (child.mixins) {
              for (let i = 0, l = child.mixins.length; i < l; i++) {
                  parent = mergeOptions(parent, child.mixins[i], vm)
              }
          }
      }
  
      const options = {}
      let key
      for (key in parent) {
          mergeField(key)
      }
      for (key in child) {
          if (!hasOwn(parent, key)) {
              mergeField(key)
          }
      }
      function mergeField (key) {
          const strat = strats[key] || defaultStrat
          options[key] = strat(parent[key], child[key], vm, key)
      }
      return options
  }
  ```

  strats 是一个定义了和options有相同属性名称的对象，里面包含了关于各个options合并方法。 策略模式

  ```js
  strats = {}
  strats.el = 
  strats.propsData = function (parent, child, vm, key){}
  strats.data = function (parentVal, childVal, vm)
  
  config._lifecycleHooks.forEach(hook => {
    strats[hook] = mergeHook
  })
  
  config._assetTypes.forEach(function (type) {
    strats[type + 's'] = mergeAssets
  })
  
  strats.watch = function (parentVal, childVal)
  
  strats.props =
  strats.methods =
  strats.computed = function (parentVal: ?Object, childVal: ?Object)
  ...
  ```

  `简单来说就是在options合并的过程中，采用策略模式，对每个选项进行合并`

  * 生命周期合并

  ``` js
  function mergeHook (
  parentVal: ?Array<Function>,
   childVal: ?Function | ?Array<Function>
  ): ?Array<Function> {
      const res = childVal
      ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
          ? childVal
      : [childVal]
      : parentVal
      return res
          ? dedupeHooks(res)
      : res
  }
  
  function dedupeHooks (hooks) {
      const res = []
      for (let i = 0; i < hooks.length; i++) {
          if (res.indexOf(hooks[i]) === -1) {
              res.push(hooks[i])
          }
      }
      return res
  }
  ```

  这里的`parentVal`指的是父类中的相对应的值或者是Vue.options.中对应的值。

  ``` 
  new Vue({
      el:"#demo",
      created(){
          console.log(123)
      }
  })
  ```

  如果针对 ‘created’ 的话，上面这串代码是不会有`parentVal`的，意思是指Vue.options中没有created。

  想要有`parentVal`就必须`Vue.options.created = fn ` 或者使用extend方法创建一个子类。eg：

  ```js
  Vue.options.created = fn
  new Vue({
      el:"#demo",
      created(){
          console.log(123)
      }
  })
  //这里的不会有父类created，如果我们不在 Vue.options中去配置created，也不存在父类的created
  //如果使用Vue.extend去创建组件，就会存在父类 
  var Test = Vue.extend({
      created(){
          console.log("父类")
      }
  })
  
  var app = new Test({
      el:"#demo",
      created(){
          console.log(123)
      }
  })
  ```

  以上两种方式都会将options中的created属性 合并成一个数组返回。

  ![image-20200623130459745](D:\Program Files\Typora\assets\image-20200623130459745.png)

  

  除了生命周期外对于options值 的所有配置项都有相对应的合并措施。

  eg：data属性的合并，这里也就解释了了为什么在组件化中data必须是函数形式。

  ``` js
  strats.data = function (
  parentVal: any,
   childVal: any,
   vm?: Component
  ): ?Function {
  if (!vm) {
      //创建组件时 data属性必须是一个函数 并且有返回值 Vue.component 会调用extend方法,extend中触发mergeOption
      //使用Vue.extend，并没有传入vm实例，这里是处理extend方法时的合并
      //    Sub.options = mergeOptions(
      //      Super.options,
      //      extendOptions
      //    )
      if (childVal && typeof childVal !== 'function') {
          process.env.NODE_ENV !== 'production' && warn(
              'The "data" option should be a function ' +
              'that returns a per-instance value in component ' +
              'definitions.',
              vm
          )
  
          return parentVal
      }
      return mergeDataOrFn(parentVal, childVal)
  }
  
  	return mergeDataOrFn(parentVal, childVal, vm)
  }
  
  export function mergeDataOrFn (
  parentVal: any,
   childVal: any,
   vm?: Component
  ): ?Function {
      if (!vm) { 
        //子组件实例化时，即Vue.extend时  
          // in a Vue.extend merge, both should be functions
          if (!childVal) {
              return parentVal
          }
          if (!parentVal) {
              return childVal
          }
          // when parentVal & childVal are both present,
          // we need to return a function that returns the
          // merged result of both functions... no need to
          // check if parentVal is a function here because
          // it has to be a function to pass previous merges.
          return function mergedDataFn () {
              return mergeData(
                  typeof childVal === 'function' ? childVal.call(this, this) : childVal,
                  typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
              )
          }
      } else {
          //正常通过new Vue时走的逻辑，返回的是一个函数，函数具体执行时才范湖真实数据
          return function mergedInstanceDataFn () {
              // instance merge
              const instanceData = typeof childVal === 'function'
              ? childVal.call(vm, vm)
              : childVal
              const defaultData = typeof parentVal === 'function'
              ? parentVal.call(vm, vm)
              : parentVal
              if (instanceData) {
                  return mergeData(instanceData, defaultData)
              } else {
                  return defaultData
              }
          }
        
      }
  }
  ```

  data属性合并解释了为什么组件化时需要的data必须是函数，而new Vue时则不需要。因为组件化主要是为了复用代码，如果组件共享同一个data衡明星不符合程序设计。采用data函数，每个组件在声明时期就已经得到独立的生成data函数，所以在Vue实例化时调用mergedInstanceDataFn返回真实数据。

  当然还有些别的属性合并暂时先不一一列出，有需要自己去看即可。以上就是Vue中的策略合并 mergeOption，结果就是得到默认的、父类的、吱声的各种属性的options对象挂载值vm.$options上。

  * 小结 ：

  ![image-20200622100649176](D:\Program Files\Typora\assets\image-20200622100649176.png)

  

  * initProxy 代理设置,代理的目的是为**vue在模板渲染时进行一层数据筛选**。防止出现非法的变量名出现。

  ``` js
  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
  } else {
      vm._renderProxy = vm
  }
  ```
  
  ```js
  initProxy = function initProxy (vm) {
      if (hasProxy) {
  // 浏览器如果支持es6原生的proxy，则会进行实例的代理，这层代理会在模板渲染时对一些非法或者不存在的字符串进行判断，做数据的过滤筛选。
          const options = vm.$options
          const handlers = options.render && options.render._withStripped
          ? getHandler
          : hasHandler
          vm._renderProxy = new Proxy(vm, handlers)
      } else {
          vm._renderProxy = vm
      }
  }
  const getHandler = {
      get (target, key) {
          if (typeof key === 'string' && !(key in target)) {
              if (key in target.$data) warnReservedPrefix(target, key)
              else warnNonPresent(target, key)
          }
          return target[key]
      }
  }
  
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
   * hasHandler 触发条件是在 模板渲染时触发的，
   * _render函数是使用with 访问vm._renderProxy，也就会触发hasHandler
   * hasHandler主要的目的是为了检测模板中的变量名称是否合法，是否包含_,$这类vue内部变量命名名称，
   * 这里就解释了为什么data中以不允许_,$为开头的变量
   * 
   */
  Vue.prototype._render = function () {
      // 内部使用with访问vm._renderProxy
      vnode = render.call(vm._renderProxy, vm.$createElement);
  }
  /**
   * 这里的this指的是vm._renderProxy, _c,_v,_s,$vv 均触发了hasHanlder
   *	with(this){return _c('div',{attrs:{"id":"demo"}},[_v("\n      "+_s($vv)+"\n      ")])}
   */
  
  ```
  
  这里的一个点是判断options.render 和 options.render._withStripped，这其实指的是渲染函数，如果有渲染函数且_withStripped直接使用getHandler，否则使用hasHandler进行代理。
  
  两种hasHandler和getHandler
  
  1.不带render版本，其实指的就是options中没有render函数，在浏览器中使用的版本是不带render的，
  
  2.在webpack环境下，vue-loader已经将模板转换成render函数了，且withStripped设为true
  
  * 小结
    * Proxy的目的主要是一个代理监测的过程，防止在模板渲染出现非法变量
    * 监测的手段根据是否拥有render函数采用两只不同的形式
    * 这里也说明了为什么在模板中不允许使用$,_开头的变量，监测机制在这里
    * 如果浏览器不支持Proxy则使用其他方式

***

* initLifecycle

  initLifecycle的目的是将当前实例添加至父组件的$children当中，并将父组件挂载至自身的$parent当中。如果子组件是抽象组件，该子组件不会出现在父组件的$children当中；如果父组件是抽象组件，则向上寻找不是抽象组件，并将子组件添加至该父组件的$children当中，并将子组件的$parent指向该父组件。父子组件路径的关系。

  * 抽象组件	

    <keep-alive>、<transition>、<transition-group>等组件组件的实现是一个对象，注意它有一个属性 abstract 为 true，表明是它一个抽象组件，这些抽象组件不会出现组件的父子路径($children,$parent)上，也不会参与渲染。

  ```js
  export function initLifecycle (vm: Component) {
      const options = vm.$options
      // 子组件注册时将父组件的实例挂载在自身的选项的 parent中
      // locate first non-abstract parent
      let parent = options.parent
      // 如果是父组件存在，且子组件不是抽象组件时，将子组件添加至父组件的$children上，
      // 如果父组件是抽象组件，则一直向上寻找非抽象组件，将子组件添加至该父组件$children当中
      if (parent && !options.abstract) {
          while (parent.$options.abstract && parent.$parent) {
              parent = parent.$parent
          }
          parent.$children.push(vm)
      }
      // 最终将父组件挂载至当前实例的$parent上
      vm.$parent = parent
      // 挂载$root组件
      vm.$root = parent ? parent.$root : vm
      // 初始化$children ，$refs ，_watcher等
      vm.$children = []
      vm.$refs = {}
  
      vm._watcher = null
      vm._inactive = null
      vm._directInactive = false
      // 实例是否挂载
      vm._isMounted = false
      // 实例是否被销毁
      vm._isDestroyed = false
      // 实例是否正在被销毁
      vm._isBeingDestroyed = false
  }
  ```

* initEvents

  ```js
  export function initEvents (vm: Component) {
      vm._events = Object.create(null)
      vm._hasHookEvent = false
      // init parent attached events
      const listeners = vm.$options._parentListeners
      if (listeners) {
          updateComponentListeners(vm, listeners)
      }
  }
  ```

  * vm._events，用于存放事件对象,究竟存放哪些事件对象呢？

  ```js
  <test @hook:created="testCreated" @hover="hoverEvent"></test>
  
  Vue.component('test',{
      template:`<div @click="clickTest">test</div> `,
      methods:{
          clickTest(){
              console.log('click test')
          }
      }
  })
  var app = new Vue({
      el:"#demo",
      data:{
          title:'这是一个test',
          $vv:'asd'
      },
      methods:{
          testCreated(){
              console.log('created')
          },
          hoverEvent(){
              console.log('hover')
          }
      }
  })
  ```

  ![image-20200624073226365](D:\Program Files\Typora\assets\image-20200624073226365.png)

  可以看到demo中的父子组件中的\_events存储事件的情况。\_events实际上存储的是父组件绑定在当前组件上的事件，在父组件初始化时并没有往\_events中存储相应的事件，而是在子组件实例化时，将父组件绑定在子组件上的事件存储到自身的\_events当中

  * vm._hasHookEvent,这个属性表明父组件是否通过@hook:将钩子函数绑定在当前组件之上,eg:

  ```js
  <Child @hook:created="testCreated"></Child> ///@hook:钩子名称="处理函数"
  ```

  * 简单说下_parentListeners的数据来源，render函数生成vnode时的在\_c(createElement)函数中的第二个参数的on属性中存放着，最终在生成vnode时将其存放在componeOptions属性当中。这里可以看到生成的vnode顺序是先生成children的vnode，最终将所有的children的vnode放在数组中传入parent生成vnode函数当中。

  ```js
  //this 指的是vm._renderProxy 就是之前代理initProxy代理的，
  //在这里访问的 变量_c、testCreated、hoverEvent都进入hasHandler
  with(this){
      return _c(
          'div',
          {attrs:{"id":"demo"}},
          [_c('test',{on:"hook:created":testCreated,"hover":hoverEvent}})],
          1
      )
  }
  ```

  ![image-20200624144207831](D:\Program Files\Typora\assets\image-20200624144207831.png)

  因为在vnode中的componentOptions下的listener存放着父类绑定在子类中的事件函数，然而这并没有完。这里只是生成了一个vnode，vnode中的存放的属性是如何存放在 实例vm的$options上的？

  当生成整个vnode后则执行_update方法，在执行\_update方法时会对vnode中 的children进行相应的实例化操作。

  ```js
  vm._update(vm._render(), hydrating) //vm._render() 返回的就是vnode
  关于_update方法暂时不讲
  ```

  

  ![image-20200624150433462](D:\Program Files\Typora\assets\image-20200624150433462.png)

  ```js
  export function createComponentInstanceForVnode (
  vnode: any, // we know it's MountedComponentVNode but flow doesn't
   parent: any, // activeInstance in lifecycle state
  ): Component {
      const options: InternalComponentOptions = {
          _isComponent: true,
          _parentVnode: vnode,
          parent
      }
      // check inline-template render functions
      const inlineTemplate = vnode.data.inlineTemplate
      if (isDef(inlineTemplate)) {
          options.render = inlineTemplate.render
          options.staticRenderFns = inlineTemplate.staticRenderFns
      }
      return new vnode.componentOptions.Ctor(options)
  }
  //-----------------------------------------------------------------------------
  const Sub = function VueComponent (options) {
      this._init(options)
  }
  ```

  options

  ![image-20200624152420348](D:\Program Files\Typora\assets\image-20200624152420348.png)

  

  在_update方法中会执行`createComponentInstanceForVnode`方法，该方法是由vnode返回一个组件实例，调用的是`new vnode.componentOptions.Ctor(options)` ,这里的构造方法指的是通过Vue.extend方法生成的子类Sub，实例化Sub，最终也是执行init方法，只是有一点不同，\_isComponent的值为true，表明是一个组件，所以再走init方法是会去去执行`initInternalComponent(vm, options)`方法。

  ```js
  export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
      const opts = vm.$options = Object.create(vm.constructor.options)
      // doing this because it's faster than dynamic enumeration.
      const parentVnode = options._parentVnode//当前实例的在父组件中的占位符vnode 即<test></test> 
      opts.parent = options.parent//当前实例的parent
      opts._parentVnode = parentVnode
  
      const vnodeComponentOptions = parentVnode.componentOptions//
      opts.propsData = vnodeComponentOptions.propsData//父组件传递过来的props,子组件需要在props中对应声明
      opts._parentListeners = vnodeComponentOptions.listeners//父组件上绑定的listeners 就是@xxx="xxx"之类的
      opts._renderChildren = vnodeComponentOptions.children//指的是组件中包含的内容<test>asdasd</test> eg:asdasd 就会出现在test的children当中，slot
      opts._componentTag = vnodeComponentOptions.tag//组件的tag
  
      if (options.render) {
          opts.render = options.render
          opts.staticRenderFns = options.staticRenderFns
      }
  }
  ```

  在`initInternalComponent(vm, options)`方法内部会对创建一个基于vm.constructor.options为原型的$options,并在$options上新增_parentListeners 、parent等熟悉。最终$options 挂载在吱声的vm.$options上。

  所以`vm.$options._parentListeners`实际上获取的是父组件绑定在当前子组件上的事件

  * updateComponentListeners

  ```js
  listeners = vm.$options._parentListeners
  if (listeners) {
      updateComponentListeners(vm, listeners)
  }
  
  
  ```

  updateComponentListeners方法很简单，他继续调用updateListeners，并传入listeners，oldListeners

  add, remove, createOnceHandler

  listeners，指的就是父组件绑定在当前组件上的事件对象，oldListeners表示当前组件上旧的事件对象，

  ```js
  export function updateComponentListeners (
  vm: Component,
   listeners: Object,
   oldListeners: ?Object
  ) {
      target = vm
      updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
      target = undefined
  }
  
  function add (event, fn) {
      //target.$on 值得vm.$on方法
      target.$on(event, fn)
  }
  
  function remove (event, fn) {
      target.$off(event, fn)
  }
  
  function createOnceHandler (event, fn) {//只处触发一次，返回一个闭包函数，执行fn之后，将其$off移除掉
      const _target = target
      return function onceHandler () {
          const res = fn.apply(null, arguments)
          if (res !== null) {
              _target.$off(event, onceHandler)
          }
      }
  }
  ```

  * 这里说一下$on、$once方法src\core\instance\events.js

  ```js
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
      const vm: Component = this
      if (Array.isArray(event)) {
          for (let i = 0, l = event.length; i < l; i++) {
              vm.$on(event[i], fn)
          }
      } else {
          //{evenaname:[fn1,fn2,fn3]}
          (vm._events[event] || (vm._events[event] = [])).push(fn)
          // optimize hook:event cost by using a boolean flag marked at registration
          // instead of a hash lookup
          if (hookRE.test(event)) {
              vm._hasHookEvent = true
          }
      }
      return vm
  }
  
  Vue.prototype.$once = function (event: string, fn: Function): Component {
      const vm: Component = this
      function on () {//实际存入$on中的是包装函数on
          vm.$off(event, on)
          fn.apply(vm, arguments)
      }
      on.fn = fn
      vm.$on(event, on)
      return vm
  }
  ```

  $on方法接受string或[string]和一个回调函数fn，如果第一个参数是数组的话则递归调用$on,否则直接在当前实例vm._events中添加事假名称的数组，将回调函数添加至这个数组当中。

  $once方法第一个参数只接受string，$once方法是将将传递进来的fn进行一次包装，将包装函数传入$on当中，执行包装函数时会触发$off方法。（论包装函数的重要性）

  * $off方法根据传递的参数不同，采用不同的处理方法，清空

  ```js
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
      const vm: Component = this
      // all
      if (!arguments.length) {//清空_events
          vm._events = Object.create(null)
          return vm
      }
      // array of events
      if (Array.isArray(event)) {//递归调用
          for (let i = 0, l = event.length; i < l; i++) {
              vm.$off(event[i], fn)
          }
          return vm
      }
      // specific event
      const cbs = vm._events[event]
      if (!cbs) {//没有的event，不予处理
          return vm
      }
      if (!fn) {//没有fn将_events[event]置空
          vm._events[event] = null
          return vm
      }
      // specific handler
      let cb
      let i = cbs.length
      while (i--) {
          cb = cbs[i]
          if (cb === fn || cb.fn === fn) {
              cbs.splice(i, 1)
              break
          }
      }
      // 找到指定的fn将其删除
      return vm
  }
  ```

  * $emit方法，主要是将_events中的对应的event属性对应的回调函数数组拿出来，进行依次执行。

  ```js
  Vue.prototype.$emit = function (event: string): Component {
      const vm: Component = this
      // 获取_events上的event对应的回调函数数组
      let cbs = vm._events[event]
      if (cbs) {
          cbs = cbs.length > 1 ? toArray(cbs) : cbs
          const args = toArray(arguments, 1)//传递的参数 去除第一个，第一个传递的是事件名称
          const info = `event handler for "${event}"`
          for (let i = 0, l = cbs.length; i < l; i++) {
              // 循环执行cbs中的回调函数 即_events[eventname][i]对应一个cb
              invokeWithErrorHandling(cbs[i], vm, args, vm, info)
          }
      }
      return vm
  }
  ```

  华丽的分割线，扯得有点远，

  继续看updateListeners方法，on是咱么之前的listeners，指的就是父组件绑定在当前组件上的事件对象，oldOn表示当前组件上旧的事件对象，进行更新。这里主要回去执行add方法，之前说过，add的最终结果会在当前实例的vm._events上添加一个event，并将回调函数放在对应的数组当中。最后会对新旧时间监听的一个比对，如果旧的不在新的里，就去移除旧的时间监听。

  ```js
  export function updateListeners (
  on: Object,
   oldOn: Object,
   add: Function,
   remove: Function,
   createOnceHandler: Function,
   vm: Component
  ) {
      let name, def, cur, old, event
      for (name in on) {
          def = cur = on[name]
          old = oldOn[name]
          //对事件修饰符进行格式化 eg: @click.once ==>{once:true ...}
          event = normalizeEvent(name)
         if (isUndef(old)) {
              if (isUndef(cur.fns)) {
                  //fns是生产渲染函数时生产的，如何产生？@hover="x++" =>{hover:{fns:function(){x++}}}
                  //推测在编译时产生的，即生成的render就是这样
                  //而@hover="abc"=>{hover:abc}
                  // 一个包装函数，将cur=>{fns:cur}
                  cur = on[name] = createFnInvoker(cur, vm)
              }
              if (isTrue(event.once)) {
                // 根据event.once判断是否创建一个只执行一次的cb ，包装一下  
                  cur = on[name] = createOnceHandler(event.name, cur, event.capture)
              }
        		// 调用add添加至vm的_events当中
              add(event.name, cur, event.capture, event.passive, event.params)
          } else if (cur !== old) {
              old.fns = cur
              on[name] = old
          }
      }
      for (name in oldOn) {//移除旧的事件监听
          if (isUndef(on[name])) {
              event = normalizeEvent(name)
              remove(event.name, oldOn[name], event.capture)
          }
      }
  }
  ```

  ```js
  //格式化事件的函数 & 、~、！  这些都是生成render函数时加上去的，render函数当中的b参数的on属性
  //eg:@hover.once==>~hover:fn
  const normalizeEvent = cached((name: string): {
                                name: string,
                                once: boolean,
                                capture: boolean,
                                passive: boolean,
                                handler?: Function,
                                params?: Array<any>
                                } => {
      const passive = name.charAt(0) === '&'
      name = passive ? name.slice(1) : name
      const once = name.charAt(0) === '~' // Prefixed last, checked first
      name = once ? name.slice(1) : name
      const capture = name.charAt(0) === '!'
      name = capture ? name.slice(1) : name
      return {
          name,
          once,//~
          capture,//!
          passive//&
      }
  })
  ```

  至此initEvents究竟做了什么就清楚了:

  * 小结：

    * initEvents当中，父组件会将绑定在子组件上的事件监听添加至子组件的_events当中，根据vue中的$emit,原理，$emit执行的时候，this指向的是谁，就在谁的\_events中寻找对应的event数组，将其拿出来挨个执行。这里解释了为什么在Vue中为什么父组件在子组件上绑定事件，而在子组件中$emit派发事件的交互原理。因为实际上都是子组件自己$emit派发,自己在\_events中$on。其实全部都在子组件中完成。父组件主要实在生成vdom和实例化子组件时将绑定上的事件传递给子组件。

      项类型this.$parent.$emit ==> this.$parent.$on 就比较好理解了，而且$on $off 第一个参数可以是数组。

***

* initRender

  ```js
  export function initRender (vm: Component) {
      /**
     * _parentVnode //指的是父组件中子组件的占位符
     */
      vm._vnode = null // the root of the child tree 
      vm._staticTrees = null // v-once cached trees
      const options = vm.$options
      const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree  父组件中子组件的占位符
      const renderContext = parentVnode && parentVnode.context //当前vm的partent实例,子组件在父组件中实例
      vm.$slots = resolveSlots(options._renderChildren, renderContext)//插槽的处理 具名和默认
      vm.$scopedSlots = emptyObject//作用域插槽
      // 就是在render函数中使用的，主要作用是返回vnode
      // 模板编译成render函数时调用的方法，false表示无需校验和转换
      vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
      // 将createElement挂载在vm.$createElement上 用户自定义render函数时调用的方法，true表示校验和转换
      vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
  
      // $attrs & $listeners are exposed for easier HOC creation.
      // they need to be reactive so that HOCs using them are always updated
      const parentData = parentVnode && parentVnode.data
  
      /* istanbul ignore else */
      /**
     * 监听$attrs和$listeners
     * 表明$attrs、$listeners是只读属性，不可更改
     */
      if (process.env.NODE_ENV !== 'production') {
          defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
              !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
          }, true)
          defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
              !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
          }, true)
      } else {
          defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
          defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
      }
  }
  ```

  * 小结
    * 在initRender中，对当前vm实例挂在了\_vnode,\_staticTrees,$slots,$scopedSlots ,_c,$createElement等属性。
    * _c,$createElement两者区别是\_c指的是模板通过编译成的render函数时调用，后者是用户自定义render函数时调用的，前者返回的都是vnode而不需要校验，后者则需要校验和转换
    * _parentVnode在这里指的父组件中的子组件的的vnode，即子组件在父组件中的表现形式。
    * 监听了当前实例的$attrs和$listeners(只读属性)

  总的来说initRender主要是为当前vm进行render初始化

  ***

  VNode 相关知识：

  * VNode 中包含20多个属性，来描述dom
    * createEmptyVNode 创建注释节点
    * createTextVNode创建文本节点
    * cloneVNode 克隆节点 （浅拷贝）

  ```js
  export default class VNode {
      tag: string | void;//标签
      data: VNodeData | void;//传递给组件的整个数据对象
      children: ?Array<VNode>;//子节点
      text: string | void;//文本内容
  	....
  
      constructor (
          tag?: string,
          data?: VNodeData,
          children?: ?Array<VNode>,
          text?: string,
          elm?: Node,
          context?: Component,
          componentOptions?: VNodeComponentOptions,
          asyncFactory?: Function
      ) {
          this.tag = tag
          this.data = data
          this.children = children
          this.text = text
          this.elm = elm
          ......
      }
  
      // DEPRECATED: alias for componentInstance for backwards compat.
      /* istanbul ignore next */
      get child (): Component | void {//获取组件实例
          return this.componentInstance
      }
  }
  
  // 创建注释vnode节点
  export const createEmptyVNode = (text: string = '') => {
    const node = new VNode()
    node.text = text
    node.isComment = true
    return node
  }
  
  // 创建文本vnode节点
  export function createTextVNode (val: string | number) {
    return new VNode(undefined, undefined, undefined, String(val))
  }
  
  // clone vnode 是为了做静态节点和slot节点的优化 避免在引用elm时出错
  export function cloneVNode (vnode: VNode): VNode {
    const cloned = new VNode(
      vnode.tag,
      vnode.data,
      vnode.children && vnode.children.slice(),
      vnode.text,
      vnode.elm,
      vnode.context,
      vnode.componentOptions,
      vnode.asyncFactory
    )
  	....
    return cloned
  }
  
  ```

  * createElement 创建vnode

    * 什么时候调用的？updateComponent方法被调用时，回去调用vm._render()方法

    ```js
    updateComponent = () => {
        vm._update(vm._render(), hydrating)
    }
    ```

    * _render 中传入vm.$createElement ，所以在自定义render函数中的createElement参数就是这时传入的

    ```js
    Vue.prototype._render = function (): VNode {
        const vm: Component = this
        const { render, _parentVnode } = vm.$options
    	...
        vnode = render.call(vm._renderProxy, vm.$createElement)
        ...
        return vnode
    }
    ```

    * createElement 封装了_createElement

    ```js
    export function createElement (
    context: Component,
     tag: any,//标签
     data: any,//传入组件数据
     children: any,//子节点
     normalizationType: any,//格式化类型 简单or全
     alwaysNormalize: boolean//是否格式化
    ): VNode | Array<VNode> {
        ...
        return _createElement(context, tag, data, children, normalizationType)
    }
    ```

    * _createElement 
      * 根据tag的不同使用不同的方法返回vnode
      * 根据normalizationType的不同，对children进行不同格式化
        * 一般而言用户自定义render或者children中有嵌套结构（ *<template>, <slot>, v-for*）需要进行完全格式化，
        * 当children中包含组件时需要进行简单格式化

    ```js
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
       * 3.动态组件处理
       */
      if (isDef(data) && isDef((data: any).__ob__)) {
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
       * 格式化children
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
    ```

    * children 格式化 格式化children时，会对相邻文本节点进行合并

    ```js
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
    
    /**
     * <template>标签会创建嵌套数组 ==><template>3</template> ==>[[_v("3")]] 
     * v-for 遍历嵌套结构时 v-for="item in [[1,2],[3,4]]"
     * 当子组件始终包含嵌套数组、或者自定义render函数时 ，则需要完全格式化，保证每个child都可用
     */
    export function normalizeChildren (children: any): ?Array<VNode> {
      return isPrimitive(children)//基本类型？
        ? [createTextVNode(children)]//返回一个TextVNode
        : Array.isArray(children)//数组
          ? normalizeArrayChildren(children) //递归判断每个child
          : undefined
    }
    ```

    * 最终生成VNode环节

      * 平台所持有的dom标签 ，采用New VNode生成vnode

      ```js
       if (config.isReservedTag(tag)) {
           // 判断是否是平台所持有的tag web端就是html和svg标签的判断
           // 是的话就采用new VNode创建vnode
           // platform built-in elements
           vnode = new VNode(
               config.parsePlatformTagName(tag), data, children,
               undefined, undefined, context
           )
       }
      ```

      * 注册的组件 ，调用createComponent方法生成vnode

      ```js
      if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
          // component 组件就调用createComponent，返回vnode
          // 这里对组件进行生产vnode ，全局注册组件和局部组件构造器的查找方式不同，两者存储在不同的地方 
          // 详见resolveAsset方法，包括对template中大消息处理
          vnode = createComponent(Ctor, data, context, children, tag)
      }
      ```

      * 未知标签  也是采用new Vnode

      ```js
       vnode = new VNode(
           tag, data, children,
           undefined, undefined, context
       )
      ```

  * createComponent 返回组件vnode

    ```js
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
        // data指传入组件的所有参数 {attrs,props,on...}
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
    
        // extract props
        // 提取props数据 并将位于data中对应的props or attrs给删除掉
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
        // 仅用于组件，用于监听原生事件，而不是组件内部使用
      	// `vm.$emit` 触发的事件
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
        // 返回一个占位vnode eg: vue-component-1-test，最终创建这个vnode时会调用实例化该组件
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
    ```

  * createComponent主要目的是返回vnode 

    * 常规组件、异步组件、抽象组件、函数式组件

    ```js
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
    ```

    * 异步组件 Vue.component(name,fun) 第二个参数是一个函数，而非配置项

    异步组件分三种形式 异步工厂函数、Promise、高级异步组件

    ```js
    function(resolve,reject){setTimeout(()=>resolve({template:"<div>异步工厂函数</div>"}),1000)}//需要resolve一下 require形式也是一个异步的过程
    ()=>import(xxxx) //返回promise对象
    ()=>{component:()=>import(xxx)}
    ```

    这种形式最终都会进入resolveAsyncComponent 中，三者的区别在于resolve指定的方式

    ```js
    const res = factory(resolve, reject)//工厂函数的执行方式 
    res.then(resolve, reject)//Promise的指定方式
    res.component.then(resolve, reject)//高级异步组件的处理方式 
    ```

    最终resolveAsyncComponent 都会返回`factory.loadingComp`(高级异步组件所持有的)或`factory.resolved`(组件的真实构造器)。由于在初次执行`resolveAsyncComponent `时`factory.resolved`没有挂载上所以是个`undefined`，将其返回。并创建一个占位节点createAsyncPlaceholder，其实就是一个注释节点vnode，只是这个节点记录了异步组件的的全部信息，用于渲染实际的异步组件

    ```js
    if (Ctor === undefined) {
        //Ctor为空，即resolve没有触发，resolved尚未挂挂载成功，此时就返回一个占位符vnode
        // 这个vnode包含渲染实际vnode的所有参数存放在 asyncFactory和asyncMeta上
        return createAsyncPlaceholder(
            asyncFactory,
            data,
            context,
            children,
            tag
        )
    }
    ```

    整个异步组件的生成过程才有用了闭包的设计，异步操作执行完成之后，仍能找到当初指定的resolve，进而去渲染。

    * v-model处理  

    ```js
    if (isDef(data.model)) {
        // 转化v-model的绑定事件和属性 默认input和value  自定义v-model的关键
        transformModel(Ctor.options, data)
    }
    function transformModel (options, data: any) {
      const prop = (options.model && options.model.prop) || 'value' //默认value
      const event = (options.model && options.model.event) || 'input' //默认input
      ;(data.props || (data.props = {}))[prop] = data.model.value
      const on = data.on || (data.on = {})
      const existing = on[event]
      const callback = data.model.callback
    //设置data.on on对象中包含一些列的事件监听
    // v-model="username"==> 会被解析成 {callback: ƒ ($$v)=>x=$$v,expression: "x",value: 0} 更新操作在f($$v)
    // 相当于@input="username=$event"
    // 这里将data.model.callback，就是回调函数
    // 处理一个事件监听多次的问题
      if (isDef(existing)) {//这里是处理callback，如果多个cb就建个栈将cb存放在内，触发时依次统一调用
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
    ```

    * 函数式组件处理

    ```js
    // functional component
    // 函数式组件
    if (isTrue(Ctor.options.functional)) {
        return createFunctionalComponent(Ctor, propsData, data, context, children)//返回vnode
    }
    //attrs 和 props
    export function createFunctionalComponent (
    Ctor: Class<Component>,//构造器
     propsData: ?Object,//props数据
     data: VNodeData,//_c中的data数据
     contextVm: Component,//当前vue实例，父元素
     children: ?Array<VNode>//子节点
    ): VNode | Array<VNode> | void {
        // 合并props 
        const options = Ctor.options
        const props = {}
        const propOptions = options.props
    	//如果声明props项，仅仅获取propOptions中规定的内容
        if (isDef(propOptions)) {
            for (const key in propOptions) {
                props[key] = validateProp(key, propOptions, propsData || emptyObject)
            }
        } else {//否则将所有的data.attrs和data.props属性合并到props当中
            if (isDef(data.attrs)) mergeProps(props, data.attrs)
            if (isDef(data.props)) mergeProps(props, data.props)
        }
    	//这里表明函数式组件即使不声明props也没关系，因为会将传入的attrs props均合并到上下文当中
        // 创建函数式组件上下文 
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
    ```

    函数式组件最主要的特点无状态 (没有[响应式数据](https://cn.vuejs.org/v2/api/#选项-数据))，也没有实例 (没有 `this` 上下文)，它仅仅只是一个函数，渲染开销低

    通常用来作为包装组件、展示静态内容等。

    eg:根据传入的props：name来动态展示test2/3 。原理是返回test2和3的tag在createElement函数中会被当成组件生成vnode，在组件挂载时去生成实际dom。样例中是返回test2的vnode，所以最终会实例化test2的vnode。如果getTag返回的是普通html标签，则会出现将test2/3组件同时渲染。

    ```html
    <test name="test2">
        <test2></test2>
    	<test3></test3>
    </test>
    <script>
        Vue.component('test',{
            functional:true,
            render(createElement,context){
                function getTag() {
                    return context.props.name//context.data.attrs.name
                }
                return createElement(getTag(),context.data,context.children)
            }
        })
    </script>
    ```

    * 抽象组件处理 
      * 只保留 props 、listener、slot 
      * 所有抽象组件渲染的时候并不会渲染自身的任何dom，都是渲染子节点，一般都是使用$slots.default[0]获取第一个子节点进行渲染（KeepAlive对第二个组件不起作用的原因，只获取slot中的第一个节点，并返回该node）

    ```js
    //src\core\components\keep-alive.js
    render () {
        const slot = this.$slots.default
        const vnode: VNode = getFirstComponentChild(slot)
            ....//缓存处理
        return vnode || (slot && slot[0])
    }
    ```

    可以看到KeepAlive的render函数最终也是返回了this.$slots.default中的第一个child

    类似的我们自己写一个抽象组件,这样直接返回this.$slots.default[0]，这时test就变成一个中间层，做一些数据处理

    ```js
    Vue.component('test',{
        abstract:true,
        render(createElement){
            return this.$slots.default[0]
        }
    })
    ```

    这里的抽象组件有点像函数式组件（功能上），但是函数式组件没有this实例，声明周期，数据状态等；而抽象组件仅仅只是不渲染吱声真实dom而已，其余和正常组件区别不大。

  小结：

  * 虚拟dom是采用js来描述真实dom元素
  * render函数最终会返回一个虚拟dom，因为其执行了createElement方法生成虚拟dom
  * createElement是对_createElement的一个包装，真实执行的是\_createElement方法
  * \_createElement方法根据传入的参数不同来决定采用new Vnode or createComponent来生成虚拟dom；一般对应平台内部标签or未知标签采用构造方式返回vnode，若是组件则采用createComponent方法返回组件vnode
  * createComponent方法首先会提取构造器；判断是否是异步组件，是异步组件则采用异步组件方式，直接返回一个注释节点，等待异步操作执行完成之后，再次更新真实节点；如果是函数时组件，则调用createFunctionalComponent创建函数式组件vnode直接返回；普通组件进行正常v-model的事件绑定，propsData的提取，listener，on，nativaOn等数据获取后，采用new Vnode生成vnode。
  * 通过在installComponentHooks时加入的钩子，在正式创建dom时，发现vnode是组件节点,进而实例该节点。（这里解释了子组件实例化时的触发点是在哪，生成dom时发现是子组件，先对去实例化）

  看图说话：

  

***

* initInjections

在执行initInjections之前，vm.$options.inject 已经在mergeOptions中格式化了，将原始的inject给变成一个object = {xxx:{from:xxx}}形式。在initInjections方法中就做了两件事执行`resolveInject`方法和`defineReactive`方法。

`defineReactive`方法设置数据响应式的，暂且不说。

`resolveInject`方法获取到`provide`中所对应的值,由于不当向parent.provide中查找，所以子组件中的inject能够获取到祖先组件中的provide中与之对应属性；如果在组先当中都没找到，则会寻找inject中是否有`default`选项，有则设置上，没有抛出错误。

```js
export function initInjections (vm: Component) {
    const result = resolveInject(vm.$options.inject, vm) //mergeOptions中被格式化成 xxx:{from:xxx}
    // result是provide or default中提供的
    // 设置响应式在vm上
    if (result) {
        toggleObserving(false)
        Object.keys(result).forEach(key => {
            /* istanbul ignore else */
            if (process.env.NODE_ENV !== 'production') {
                defineReactive(vm, key, result[key], () => {
                    warn(
                        `Avoid mutating an injected value directly since the changes will be ` +
                        `overwritten whenever the provided component re-renders. ` +
                        `injection being mutated: "${key}"`,
                        vm
                    )
                })
            } else {
                defineReactive(vm, key, result[key])
            }
        })
        toggleObserving(true)
    }
}


export function resolveInject (inject: any, vm: Component): ?Object {
    if (inject) {
        // inject is :any because flow is not smart enough to figure out cached
        const result = Object.create(null)//map
        const keys = hasSymbol//获取key
        ? Reflect.ownKeys(inject)
        : Object.keys(inject)

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            // #6574 in case the inject object is observed...
            if (key === '__ob__') continue
            const provideKey = inject[key].from //获取提供的key [xxx]=>xxx
            let source = vm
            while (source) {//递归向上寻找source._provided 和source._provided[provideKey]
                if (source._provided && hasOwn(source._provided, provideKey)) {
                    result[key] = source._provided[provideKey]//组件上的provide都会挂载至_provide属性上
                    break
                }
                source = source.$parent
            }//一直找到顶层，如果没有//则查看是否设置default 
            /**
           * inject:{
              foo:{
                from: 'bar',
                default: 'foo'
              }
            }
           */
            if (!source) {
                if ('default' in inject[key]) {//设置default
                    const provideDefault = inject[key].default
                    result[key] = typeof provideDefault === 'function'
                        ? provideDefault.call(vm)
                    : provideDefault
                } else if (process.env.NODE_ENV !== 'production') {
                    warn(`Injection "${key}" not found`, vm)
                }
            }
        }
        return result
    }
}
```

***

* initState

  * defineReactive

  initState中的核心模块，设置数据响应式，也是Vue响应式原理核心模块

  ```js
  /**
       * Define a reactive property on an Object.
       * 在一个对象中定义一个响应式属性
       */
  export function defineReactive (
      obj: Object,//设置的对象
       key: string,//设置的属性
       val: any,//设置的value
       customSetter?: ?Function,//自定义setter
       shallow?: boolean
  ) {
      const dep = new Dep()//依赖收集器，每个响应式属性对应一个依赖收集器
  
      const property = Object.getOwnPropertyDescriptor(obj, key) //可配置的属性
      if (property && property.configurable === false) {
          return
      }
  
      // cater for pre-defined getter/setters
      const getter = property && property.get
      const setter = property && property.set
      if ((!getter || setter) && arguments.length === 2) {
          val = obj[key]
      }
  
      let childOb = !shallow && observe(val)//将val设置成可观察对象，理解为深层次观察对象（观察vnode之外的对象）
      //   这个操作会导致，val如果是简单类型，则不会反悔observe实例
      // 若是object or array 则会范湖一个observe实例，并且将会递归调用至每个val
      Object.defineProperty(obj, key, {
          enumerable: true,
          configurable: true,
          get: function reactiveGetter () {//返回值之前，先进行依赖收集
              //注意 ：这里的get是指在获取值得时候 被触发
              // 而这里引用的 val ，getter childOb 是在defineReactive函数当中定义的
              // 当触发get而执行reactiveGetter时，这些值并没有被销毁，而是存在于闭包当中
              // 当函数在定义环境之外执行时，仍能访问其定义时的作用域中的变量，即产生了闭包
              // 这里对val的引用就是闭包
              // 根据value具体情况进行处理
              const value = getter ? getter.call(obj) : val
              if (Dep.target) {
                  dep.depend()//当前属性对应
                  if (childOb) {//childOb 说明val不是简单类型
                      childOb.dep.depend()
                      if (Array.isArray(value)) {//value是数组时处理
                          dependArray(value)
                      }
                  }
              }
              return value
          },
          set: function reactiveSetter (newVal) {//更新数据之后，通知视图更新
              //set设置
              const value = getter ? getter.call(obj) : val
              /* eslint-disable no-self-compare */
              if (newVal === value || (newVal !== newVal && value !== value)) {
                  return
              }
              /* eslint-enable no-self-compare */
              if (process.env.NODE_ENV !== 'production' && customSetter) {
                  customSetter()
              }
              // #7981: for accessor properties without setter
              if (getter && !setter) return
              if (setter) {
                  setter.call(obj, newVal)
              } else {
                  val = newVal
              }
              childOb = !shallow && observe(newVal)//这里很重要，对新设置的newVal也进行观察
              dep.notify()//通知更新操作
          }
      })
  }
  ```

  `defineReactive`在这里只做一件事，就是定义的对象obj的key属性设置属性描述符`get`和`set`(属性描述符有很多种)，get是获取obj[key],而set 是obj[key] = xxx的操作。当然如果发现obj[key]的值是一个数组和对象时，就需要调用`observe`方法，挨个对其设置get和set，来拦截数据操作。

  * observe和Observe

  ```js
  export function observe (value: any, asRootData: ?boolean): Observer | void {//创建一个Observe实例
      if (!isObject(value) || value instanceof VNode) {
          return
      }
      let ob: Observer | void
      if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
          ob = value.__ob__//value已经挂载Observe实例，此时就不需要在实例化了
      } else if (
          shouldObserve &&
          !isServerRendering() &&
          (Array.isArray(value) || isPlainObject(value)) &&
          Object.isExtensible(value) &&
          !value._isVue
      ) {//一通判断，value没有被Observe，也能够被Observe，就对value创建一个新的Observe
          ob = new Observer(value)
      }
      if (asRootData && ob) {
          ob.vmCount++
      }
      return ob//范湖Observe实例
  }
  ```

  observe方法很简单，就是返回一个关于value的Observe实例

  ```js
  export class Observer {
      value: any;
      dep: Dep;
      vmCount: number; // number of vms that have this object as root $data
  
      constructor (value: any) {
          this.value = value
          this.dep = new Dep()//依赖收集类
        //最开始看到这个dep有点，疑惑，这玩意的watcher在哪添加的，后来放心 是在  childOb.dep.depend()
        //这个observe.dep所维护的watcher指的是复杂值object和array变更的关系
        //但是这里并有创建新的的watcher  
          this.vmCount = 0
          def(value, '__ob__', this)//__ob__设置成不可枚举属性，即无法遍历 每个被观察的value都对应一个__ob__属性，指向Observer实例，包含value和依赖收集
          if (Array.isArray(value)) {//数组处理
              if (hasProto) {
                  protoAugment(value, arrayMethods)
              } else {
                  copyAugment(value, arrayMethods, arrayKeys)
              }
              this.observeArray(value)//观察数组中的每一项
          } else {
              this.walk(value)//对象处理，将对象中每一个key重新走一遍defineReactive
          }
      }
  
      walk (obj: Object) {//对obj中属性挨个定义get，set
          const keys = Object.keys(obj)
          for (let i = 0; i < keys.length; i++) {
              defineReactive(obj, keys[i])
          }
      }
  
      /**
         * Observe a list of Array items.
         */
      observeArray (items: Array<any>) {//对数组中每项挨个observe
          for (let i = 0, l = items.length; i < l; i++) {
              observe(items[i])
          }
      }
  }
  ```

  Observe 主要就是对传入的obj进行一个递归操作来设置get和set。其中observe上的dep属性，维护的是value值（对象、数组）本身。他们调用的时间点：对数组push等七个方法重写的函数中；set方法，为一个对象添加一个属性；del方法，为对象删除一个属性

  ```js
  export function set (target: Array<any> | Object, key: any, val: any): any {
      ...
      defineReactive(ob.value, key, val)
      ob.dep.notify()//对象(对应的value是对象or数组时通知的更新)本身增删属性或者数组变化的时候被触发的Dep
  
      return val
  }
  
  /**
   * Delete a property and trigger change if necessary.
   */
  export function del (target: Array<any> | Object, key: any) {
      ...
      delete target[key]
  
      ob.dep.notify()//对象(对应的value是对象or数组时通知的更新)本身增删属性或者数组变化的时候被触发的Dep
  }
  ```

  * Dep

  Dep类就是一个管理者，管理着所有的Watcher实例，当observe监测到数据发生了变化时，就会让dep去通知所有的watcher去进行更新。Dep维护着数据和watcher之间的关系。

  ```js
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
  ```

  * Watcher

  ```js
  export default class Watcher {
      vm: Component;
      expression: string;
      cb: Function;//指定更新方法 eg:$watcher
      id: number;
      deep: boolean;
      user: boolean;
      lazy: boolean;
      sync: boolean;
      dirty: boolean;
      active: boolean;
      deps: Array<Dep>;
      newDeps: Array<Dep>;
      depIds: SimpleSet;
      newDepIds: SimpleSet;
      before: ?Function;
      getter: Function;
      value: any;
  
      /**
      	仅仅在渲染watcher时
         * updateComponent
         * updateComponent = () => {
            vm._update(vm._render(), hydrating)
          }
          组件$mount时执行了new Watcher =>即一个组件对应一个watcher
         */
      constructor (
          vm: Component,//Vue实例
          expOrFn: string | Function,// 组件挂载时（创建的是渲染watcher） 传入的 updateComponent 最终执行_update方法更新dom
          cb: Function,//回调函数
          options?: ?Object,//配置项
          isRenderWatcher?: boolean//是否渲染watcher
      ) {
          this.vm = vm
          if (isRenderWatcher) {
              vm._watcher = this
          }
          vm._watchers.push(this)//vm._watchers管理者当前组件中的watcher
          // options
          if (options) {
              this.deep = !!options.deep
              this.user = !!options.user
              this.lazy = !!options.lazy
              this.sync = !!options.sync
              this.before = options.before
          } else {
              this.deep = this.user = this.lazy = this.sync = false
          }
          this.cb = cb
          this.id = ++uid // uid for batching
          this.active = true
          this.dirty = this.lazy // for lazy watchers
          this.deps = []
          this.newDeps = []
          this.depIds = new Set()
          this.newDepIds = new Set()
          this.expression = process.env.NODE_ENV !== 'production'
              ? expOrFn.toString()
          : ''
          // parse expression for getter
          if (typeof expOrFn === 'function') {
              this.getter = expOrFn
          } else {
              this.getter = parsePath(expOrFn)
              if (!this.getter) {
                  this.getter = noop
                  process.env.NODE_ENV !== 'production' && warn(
                      `Failed watching path: "${expOrFn}" ` +
                      'Watcher only accepts simple dot-delimited paths. ' +
                      'For full control, use a function instead.',
                      vm
                  )
              }
          }
          this.value = this.lazy
              ? undefined
          : this.get()
      }
      run () {
          if (this.active) {
              const value = this.get()
              if (
                  value !== this.value ||
                  // Deep watchers and watchers on Object/Arrays should fire even
                  // when the value is the same, because the value may
                  // have mutated.
                  isObject(value) ||
                  this.deep
              ) {
                  // set new value
                  const oldValue = this.value
                  this.value = value
                  if (this.user) {
                      try {
                          this.cb.call(this.vm, value, oldValue)
                      } catch (e) {
                          handleError(e, this.vm, `callback for watcher "${this.expression}"`)
                      }
                  } else {
                      this.cb.call(this.vm, value, oldValue)//watch中定义的方法 value和oldVaule的来源
                  }
              }
          }
      }
      update () {
          /* istanbul ignore else */
          if (this.lazy) {
              this.dirty = true
          } else if (this.sync) {
              this.run()
          } else {//watcher队列
              queueWatcher(this)
          }
      }
  }
  ```
```
  
在Watcher构造函数中最重要的莫过于`expression`参数。expression就是指在lifecyle中定义的`updateComponent`方法，watcher.get会执行该方法。最终执行_update 和render渲染函数中。执行在渲染函数render中会触发set，进行依赖收集，而此时的watcher就是当前组件渲染时的watcher（渲染watcher）。Vue2.0映入的虚拟dom点就在这里，1.0对应每个值都会有个watcher去管理其状态，而2.0中使用的组件的wathcer去管理状态，由于粒度到组件，所以需要diff算法来帮助，比较新老vnode的变化，最终去更新最终的dom。
  
* queueWatcher的队列处理。
  
  ```js
  export function queueWatcher (watcher: Watcher) {//两件事 1.将watcher添加至queue中 2。判断推入下一个nexttick
      const id = watcher.id
      if (has[id] == null) {
          has[id] = true
          if (!flushing) {
              queue.push(watcher)
          } else {
              // if already flushing, splice the watcher based on its id
              // if already past its id, it will be run next immediately.
              let i = queue.length - 1
              while (i > index && queue[i].id > watcher.id) {
                  i--
              }
              queue.splice(i + 1, 0, watcher)
          }
          // queue the flush
          if (!waiting) {
              waiting = true
     // flushSchedulerQueue每执行玩一次，waiting就变为false，变为false，就会执行nextTick(flushSchedulerQueue)，
        // 所以这里就保证了一个缓冲效果
        // 在当前执行的任务序列没完成时，始终在当前接受watcher放置在一个queue当中，
        // 当当前的任务完成后，则将新的队列推入nextTick中去排队执行
              if (process.env.NODE_ENV !== 'production' && !config.async) {
                  flushSchedulerQueue()
                  return
              }
        // 本质是利用事件循环的微任务队列实现异步更新 在nextTick中缓存多个数据处理过程，等到下一个tick时，再去执行更新操作
              nextTick(flushSchedulerQueue)
              
          }
      }
  }
  
  function flushSchedulerQueue () {//两件事 1.queue队列排序 2.执行watcher的run方法
      flushing = true
      let watcher, id
  
      // queue排序的三大原因
      // 1. //保证父组件watcher先更新
      // 2. 用户自定义watcher在渲染wathcer之前先执行
      // 3. 父组件watcher.run执行时，子组件被删除了，该watcher可跳过
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
```

queueWatcher方法可以想象成搬砖，你一次可以搬多块砖，将砖卸掉之后，又可以去搬另一摞。

关于nextTick的宏任务和微任务以后再看。

响应式简陋demo

  ```js
  //简版响应式demo 过于简陋，主要理清原理
  function observe(obj){//
      if(!obj||typeof obj!=='object'){
          return
      }
      Object.keys(obj).forEach(key=>{
          defineReactive(obj,key,obj[key])
      })
      console.log('完成了数据监测☞',obj)
  }
  
  function defineReactive(target,key,value){
      const dep = new Dep()
      Object.defineProperty(target,key,{
          get(){
              //依赖收集
              // dep.add
              Dep.target&&dep.addDep(Dep.target)
              return value
          },
          set(newValue){
              value = newValue
              //数据更新  
              dep.notify()
          }
      })
      observe(value)
  }
  
  class Dep{
      static target = undefined
      constructor(){
          this.subs = []
      }
  
      addDep(watcher){
          console.log('新增一个watcher')
          this.subs.push(watcher)
      }
  
      notify(){
          this.subs.forEach(watcher=>{
              watcher.update()
          })
      }
  
  }
  
  class Watcher{
      constructor(vm,key,cb){
          this.vm = vm
          this.key = key
          this.cb = cb
  
          Dep.target = this
  
          this.vm[this.key]
          Dep.target = null
      }
  
      update(){
          // 数据被更新了
          // this.cb.call(this.vm,this.vm[this.key])
          console.log('数据被更新了',this.key,this.vm[this.key])
      }
  }
  const obj = {
      a:123,
      b:{
          c:123
      }
  }
  
  observe(obj)
  
  new Watcher(obj,'a')
  new Watcher(obj,'b')
  new Watcher(obj.b,'c')
  ```

以上就是Vue响应式相关 原理，里面主要涉及闭包，观察者模式，异步任务队列。总的来说就是Watcher是数据的维护着，Dep作为watcher的管理者，他维护的是和某个数据相关的所有watcher，当数据变动时，会执行数据所对应的Observ实例中的dep.notify, 最终会让相关的watcher来执行相关更新操作。Dep依赖收集是在getter被触发时进行的收集，而watcher实例化时，其实是在创建真实dom之前，因为在创建真实dom时会用到相关数据，此时会触发相关getter完成依赖收集。

***

* initstate方法主要是初始化options中的 props，methods，data，computed，watch
  
```js
  export function initState (vm: Component) {
    vm._watchers = []
      const opts = vm.$options
      if (opts.props) initProps(vm, opts.props)
      if (opts.methods) initMethods(vm, opts.methods)
      if (opts.data) {
          initData(vm)
      } else {
          observe(vm._data = {}, true /* asRootData */)
      }
      if (opts.computed) initComputed(vm, opts.computed)
      if (opts.watch && opts.watch !== nativeWatch) {
          initWatch(vm, opts.watch)
      }
  }
```

  * initProps

initProps中对props设置响应式，且校验了传递到组件中的propsData，在createComponent时并没有对其进行校验，在组件内部对其进行校验。在父组件的render过程中，会生成子组件的占位vnode，并将传递给子组件的属性解析成{attrs：{...}}等，该占位vnode中包含propsData中就是从父组件从属性上传递过来的数据。当子组件实例化时，会将propsData取出并根据子组件自己定义的propsOptions进行校验（注意数据校验是在子组件实例化进行校验的），对合法的值进行响应式设置，最终代理props数据到vm实例上。

```js
  function initProps (vm: Component, propsOptions: Object) {
    const propsData = vm.$options.propsData || {}
      const props = vm._props = {}
      // cache prop keys so that future props updates can iterate using Array
      // instead of dynamic object key enumeration.
      const keys = vm.$options._propKeys = []
      const isRoot = !vm.$parent
      // root instance props should be converted
      if (!isRoot) {
          toggleObserving(false)
      }
      for (const key in propsOptions) {
          keys.push(key)
          const value = validateProp(key, propsOptions, propsData, vm)//校验propsData ，是在createComponet中提取的，当时只提取数据，校验在这一步完成
          /* istanbul ignore else */
          if (process.env.NODE_ENV !== 'production') {
              const hyphenatedKey = hyphenate(key)
              if (isReservedAttribute(hyphenatedKey) ||
                  config.isReservedAttr(hyphenatedKey)) {
                  warn(
                      `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
                      vm
                  )
              }
              //设置props响应式 对props更改时进行提示处理，
              // 也就是说在子组件中修改props中的属性会进行报错提示（仅在开发模式中生效）
              defineReactive(props, key, value, () => {
                  if (!isRoot && !isUpdatingChildComponent) {
                      warn(
                          `Avoid mutating a prop directly since the value will be ` +
                          `overwritten whenever the parent component re-renders. ` +
                          `Instead, use a data or computed property based on the prop's ` +
                          `value. Prop being mutated: "${key}"`,
                          vm
                      )
                  }
              })
          } else {
              defineReactive(props, key, value)
          }
          // static props are already proxied on the component's prototype
          // during Vue.extend(). We only need to proxy props defined at
          // instantiation here.
          // 代理到_props中 即vm.xxx 访问到vm._props.xxx
          if (!(key in vm)) {
              proxy(vm, `_props`, key)
          }
      }
      toggleObserving(true)
  }
```

  * initMethods

method没什么可说的，开发者模式中会对methods进行校验做出相应提示，最重要的是methods必须是一个函数

```js
  function initMethods (vm: Component, methods: Object) {
      const props = vm.$options.props
      for (const key in methods) {
          if (process.env.NODE_ENV !== 'production') {
              if (typeof methods[key] !== 'function') {// method必须为函数形式
                  warn(
                      `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
                      `Did you reference the function correctly?`,
                      vm
                  )
              }
              if (props && hasOwn(props, key)) {// methods方法名不能和props重复
                  warn(
                      `Method "${key}" has already been defined as a prop.`,
                      vm
                  )
              }
              if ((key in vm) && isReserved(key)) { //  不能以_ /$ 等vue内部约定开头
                  warn(
                      `Method "${key}" conflicts with an existing Vue instance method. ` +
                      `Avoid defining component methods that start with _ or $.`
                  )
              }
          }
          vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)//noop 空函数
      }
  }
```

  * initData

  data在mergeOptions时选项合并时，会生成一个函数，在执行这个函数后会拿到真实数据。initData中对获取到的data进行校验，必须满足 不在props、methods内，不以_ $等内部变量开头。执行observe（data），设置data为响应式对象，并对每个属性做响应式处理，最终代理的vm实例上。

  ```js
  function initData (vm: Component) {
      let data = vm.$options.data
      // 根组件的data是一个对象，子组件的data是一个fn，其中getData会调用函数返回data对象
      data = vm._data = typeof data === 'function'
          ? getData(data, vm)
      : data || {}//获取data数据
      if (!isPlainObject(data)) {//校验data的返回值
          data = {}
          process.env.NODE_ENV !== 'production' && warn(
              'data functions should return an object:\n' +
              'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
              vm
          )
      }
      // proxy data on instance
      const keys = Object.keys(data)
      const props = vm.$options.props
      const methods = vm.$options.methods
      let i = keys.length
      while (i--) {//校验data
          const key = keys[i]
          if (process.env.NODE_ENV !== 'production') {
              if (methods && hasOwn(methods, key)) {// 命名不能和methods重复
                  warn(
                      `Method "${key}" has already been defined as a data property.`,
                      vm
                  )
              }
          }
          if (props && hasOwn(props, key)) {// 命名不能和props重复
              process.env.NODE_ENV !== 'production' && warn(
                  `The data property "${key}" is already declared as a prop. ` +
                  `Use prop default value instead.`,
                  vm
              )
          } else if (!isReserved(key)) {
              proxy(vm, `_data`, key)// 数据代理
          }
      }
      // observe data
      observe(data, true /* asRootData */)//监测数据，添加属性__ob__ 为Observe实例，设置data的每个属性的get和set，表明data是一个响应式对象 
  }
  ```

  * initComputed

  computed配置项可以是一个函数or对象，对象必须具备set，computed的每个属性都会实例化一个watcher来管理数据的依赖。最后对computed进行响应式设置。在initComputed中有个非常重要的点，就是间接依赖的收集。即computed计算属性的watcher会收集a，b的dep，当a和b改变时，计算属性随之会发生变化。因为在a的set时，触发了a的dep.notify().会依次调用dep中存放的一系列watcher。在触发a的get时，computed计算属性的watcher就已经被收集到a的dep当中，所以a的值改变，自然会导致computed的值发生变化。但是a的值改变如何去通知组件去进行更新的呢？

  即如何通知组件渲染watcher去执行_updat方法?

  这就需要利用watcher中存放的dep依赖项。在computed计算属性watcher中的deps依赖项中存放了a和b的dep。我遍历计算属性的deps数组，将组件渲染watcher 依次添加至a和b的dep当中。这样a和b就拥有了通知组件重新渲染的watcher。所以即使页面没有a和b的对组件watcher的直接依赖收集，最后在computed中也会完成对组件watcher的直接收集。

  ```js
  function initComputed (vm: Component, computed: Object) {//初始化initComputed
      // $flow-disable-line
      const watchers = vm._computedWatchers = Object.create(null)
      // computed properties are just getters during SSR
      const isSSR = isServerRendering()
  
      for (const key in computed) {
          const userDef = computed[key]
          const getter = typeof userDef === 'function' ? userDef : userDef.get//computed的配置项要么是函数、要么是具有get的对象
          if (process.env.NODE_ENV !== 'production' && getter == null) {
              warn(
                  `Getter is missing for computed property "${key}".`,
                  vm
              )
          }
  
          if (!isSSR) {
              // create internal watcher for the computed property.
              watchers[key] = new Watcher(//创建computed的watcher，即每个computed都有一个watcher来对其进行管理
                  vm,
                  getter || noop,//这里的getter就不是渲染watcher的updateComponent方法了,而是在computed中定义的方法，当这个方法执行时，会触发响应式的收集（如果有的话）
                  noop,
                  computedWatcherOptions
              )
          }
  
          // component-defined computed properties are already defined on the
          // component prototype. We only need to define computed properties defined
          // at instantiation here.
          if (!(key in vm)) {//设置响应式数据（get和set），并挂载至vm上
              defineComputed(vm, key, userDef)
          } else if (process.env.NODE_ENV !== 'production') {//表明和props、data中冲突 因为这两在它之前挂载至vm上
              if (key in vm.$data) {
                  warn(`The computed property "${key}" is already defined in data.`, vm)
              } else if (vm.$options.props && key in vm.$options.props) {
                  warn(`The computed property "${key}" is already defined as a prop.`, vm)
              }
          }
      }
  }
  
  export function defineComputed (//定义computed属性中的的get和set描述符，定义到vm上 
      target: any,
       key: string,
       userDef: Object | Function
      ) {
          const shouldCache = !isServerRendering()
          if (typeof userDef === 'function') {
              sharedPropertyDefinition.get = shouldCache
                  ? createComputedGetter(key)
              : createGetterInvoker(userDef)
              sharedPropertyDefinition.set = noop
          } else {
              sharedPropertyDefinition.get = userDef.get
                  ? shouldCache && userDef.cache !== false
                  ? createComputedGetter(key)
              : createGetterInvoker(userDef.get)
              : noop
              sharedPropertyDefinition.set = userDef.set || noop
          }
          if (process.env.NODE_ENV !== 'production' &&
              sharedPropertyDefinition.set === noop) {
              sharedPropertyDefinition.set = function () {
                  warn(
                      `Computed property "${key}" was assigned to but it has no setter.`,
                      this
                  )
              }
          }
          Object.defineProperty(target, key, sharedPropertyDefinition)
      }
  
      function createComputedGetter (key) {//render函数中若使用computed属性，则会触发这个get，进行依赖收集，
          return function computedGetter () {
              const watcher = this._computedWatchers && this._computedWatchers[key] //this._computedWatchers是初始化时存入的watcher。根据访问的key，取出对应的watcher
              if (watcher) {//找到存储的computed对应的watcher
                  if (watcher.dirty) {
                      watcher.evaluate()//执行计算，调用watcher.get方法，将Dep.target设置成当前computed watcher，设置watcher.value的值
                      // 若获取观察者对象中的属性，则会调用该观察者多的get，将当前的computed watcher添加至该属性的dep是当中，进行依赖收集
                      // 最后将Dep.target指向前一个wather
                      // 执行get时 先将Dep.target指向 当前计算属性的watcher
                      // get执行结束时，将Dep.target回退至之前的版本
                  }
  
                  if (Dep.target) {//此时Dep.target又指向了渲染watcher
                      watcher.depend()//这里的watcher指向的是computed watcher
                      // 渲染watcher添加了computed watcher中的deps项，表示通过组件渲染watcher去订阅 computed中的依赖dep
                      /**
                   * 当前的computed watcher 会收集 到相关的依赖（data,computed中的属性）的dep，比如说我使用了this.a 和this.b
                   * 但是我在页面中没有直接使用{{a}} {{b}}来建立组件和a,b直接的dep
                   * 但是我使用computed时，这个computed会触发get进行收集依赖dep =>computed watcher.deps下
                   * 接着遍历watcher.deps 即 a和b的dep项，调用的 dep.depend方法，将组件Watcher Dep.target ,添加至a和b的dep当中
                   */
                  }
                  return watcher.value
              }
          }
  }
  ```

  * initWatch

  initWatcher就是对options中的watcher进行创建，这里的配置handler可以是一个数组[fn]，创建多个handler

  ```js
  function initWatch (vm: Component, watch: Object) {
      for (const key in watch) {
          const handler = watch[key]
          if (Array.isArray(handler)) {
              for (let i = 0; i < handler.length; i++) {
                  createWatcher(vm, key, handler[i])
              }
          } else {
              createWatcher(vm, key, handler)//执行vm.$watch 创建自定义watcher
          }
      }
  }
  function createWatcher (
      vm: Component,//组件实例
       expOrFn: string | Function,//获取的属性
       handler: any,//回调函数
       options?: Object
  ) {
      if (isPlainObject(handler)) {//解析handler
          options = handler
          handler = handler.handler
      }
      if (typeof handler === 'string') {//hander 为string时
          handler = vm[handler]//获取vm.handler方法
      }
      return vm.$watch(expOrFn, handler, options)
  }
  ```

  initWatcher方法很简单，就是对watch中的配置项，依次执行vm.$watch方法。

  ```js
  Vue.prototype.$watch = function (
  expOrFn: string | Function,//表达式key
   cb: any,//回调函数
   options?: Object//配置项
  ): Function {
      const vm: Component = this
      if (isPlainObject(cb)) {
          return createWatcher(vm, expOrFn, cb, options)
      }
      options = options || {}
      options.user = true//$watcher创建的都是用户自定义watcher
      const watcher = new Watcher(vm, expOrFn, cb, options)//实例化watcher ,会继续调用watcher的getter方法，触发依赖收集，将当前watcher，添加至dep当中
      if (options.immediate) {//immediate=true立即执行cb
          try {
              cb.call(vm, watcher.value)
          } catch (error) {
              handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
          }
      }
      return function unwatchFn () {//$watch会返回一个unwatchFn方法，它会调用watcher.teardown()移除当前watcher，
          // vm._watchers中移除
          // 当前watcher中依赖dep中删除watcher
          watcher.teardown()
      }
  }
  ```

  $watch方法就是创建一个watcher 并且返回值是一个函数，可以删除当前所创建的watcher。在new Watcher中，回去值执行watcher.get方法，在get方法执行中，会触发表达式expOrFn的get，进行依赖收集，将当前watcher添加至对应的dep当中，完成依赖收集。如果watch的options.immediate 设置为true时，则会立即触发该回调函数cb。

***

* initProvide

```js
export function initProvide (vm: Component) {
    const provide = vm.$options.provide
    if (provide) {
        vm._provided = typeof provide === 'function'
            ? provide.call(vm)
        : provide
    }
}
```

initProvide很简单，就是将provide挂载至当前实例vm._provided上。如果是函数就执行函数，将返回结果挂载上。这里就解释了为什么在inject注入时，会从parent.\_provided对象中获取与之对应的值。

至此就是created前的逻辑，

下面就是mount

***

* $mount

vue实例挂载方法。

```js
if (vm.$options.el) {
    vm.$mount(vm.$options.el)
}
```

其实这里的$mount方法执行的是src/platforms/web/entry-runtime-with-compiler.js

```js
const mount = Vue.prototype.$mount

Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  ....
  //前面写过,这里的$mount方法最最重要的是使用编译器模块生成 render函数，放置在vm.$options当中
  //再就是执行Vue.prototype.$mount方法，即真正的挂载方法
  return mount.call(this, el, hydrating)
}
```

* Vue.prototype.$mount 

```js
//src/platforms/web/entry-runtime.js
Vue.prototype.$mount = function (
    el?: string | Element,
     hydrating?: boolean
): Component {
    el = el && inBrowser ? query(el) : undefined
    return mountComponent(this, el, hydrating)
}
```

Vue.prototype.$mount 也很简单，就是执行了`mountComponent`方法

* mountComponent

```js
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  // 判断是否有render函数，没有在给与一个空的虚拟dom
  if (!vm.$options.render) {//挂载组件$mount时，先看看有没有render函数，没有render函数，创建一个注释vnode
    vm.$options.render = createEmptyVNode
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  callHook(vm, 'beforeMount')//beforeMount的钩子

  /**
   * 定义一个updateComponent
   * 用于更新组件
   * 渲染watcher的get方法执行时会去执行这个方法
   * 即渲染watcher执行update时，实际执行的就是updateComponent方法
   */
  let updateComponent
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      const vnode = vm._render() //创建虚拟dom
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      vm._update(vnode, hydrating) //更新虚拟dom
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    updateComponent = () => {
      // 渲染watcher执行updateComponent时，实际就是在执行 vm._update方法，进行更新dom操作，vm._render方法就是返回vnode
      vm._update(vm._render(), hydrating)
    }
  }

  // 创建watcher
  // 组件渲染时创建的watcher是渲染watcher，所以isRenderWatcher是true，表明渲染watcher
  // 渲染watcher创建时，会立即调用watcher.get =>updateComponent()
  // 所以此时会去生成虚拟dom并创建dom元素
  // 然而此时render方法会去触发相应的get，进而引发依赖收集
  // 当new Watcher执行结束后，此时_update方法以执行，dom元素以创建
  // 即isMounted=true，挂载完成
  // 调用mounted钩子 
  // beforeMounted和mounted就是在渲染Watcher创建前后
  new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}
```

mountComponent其实也很简单，两件事。1.定义组件更新函数updateComponent 2.创建组件渲染watcher，在渲染watcher创建后立即调用updateComponent方法，进行组件的渲染（依赖收集等）

* updateComponent

```js
updateComponent = () => {
    // 渲染watcher执行updateComponent时，实际就是在执行 vm._update方法，进行更新dom操作，vm._render方法就是返回vnode
    vm._update(vm._render(), hydrating)
}
```

这里其实就只执行了 vm._update方法和vm.\_render方法。

* Vue.prototype._render方法

```js
Vue.prototype._render = function (): VNode {
    const vm: Component = this
    // render函数 和 _parentVnode父组件中的占位节点
    const { render, _parentVnode } = vm.$options

    if (_parentVnode) {//如果在父组件中有占位节点，就获取占位节点中的slots
        vm.$scopedSlots = normalizeScopedSlots(
            _parentVnode.data.scopedSlots,
            vm.$slots
        )
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode
    // render self
    let vnode
    try {
        vnode = render.call(vm._renderProxy, vm.$createElement)//调用render函数，传入vm.$createElement，创建vnode，具体见vnode节
        // 这里主要一点，在创建vnode时，如果组件<test>xxxx</test>,父组件在创建vnode时，其children中只有这个vnode（组件vnode）
        // 而在父组件镜像update时，即创建真实dom的时候，发现这个child是一个组件vnode的时候，就需要根据这个vnode去实例化一下，即实例化child，并且等他挂载完成后
        // 父组件才继续创建在其之后的child
    } catch (e) {
        handleError(e, vm, `render`)
        // return error render result,
        // or previous vnode to prevent render error causing blank component
        /* istanbul ignore else */
        if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
            try {
                vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
            } catch (e) {
                handleError(e, vm, `renderError`)
                vnode = vm._vnode
            }
        } else {
            vnode = vm._vnode
        }
    }
    // if the returned array contains only a single node, allow it
    if (Array.isArray(vnode) && vnode.length === 1) {
        vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
        if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
            warn(
                'Multiple root nodes returned from render function. Render function ' +
                'should return a single root node.',
                vm
            )
        }
        vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode//设置父节点,其实就是占位vnode 子组件在父组件中的vnode表现形式
    return vnode
}
```

Vue.prototype._render其实就是调用render函数，并传入一个$createElement方法，来辅助生成vnode，注意render函数中的this指向的是vm.\_renderProxy,这里设置了一些拦截器，对一些数据的校验之类的，在这里会触发相应的get和set进行依赖收集。最终返回render函数生成的vnode。

* _update

将render函数返回的vnode出入_update方法，进行dom元素的实际创建工作。创建完的dom元素最终挂载至vm.$el上。即在__patch__后，$el上就已挂载上了当前组件实例的真实dom了。当然如果父组件在创建子组件时，发现其实组件vnode，则会先去对子组件实例化之后，将其挂载至父组件上。

```js
Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
        // initial render
        //初始化时直接根据vnode开始创建dom元素
        vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
        // updates
        //更新操作,这个时候就需要新老vnode做diff，找出差异值进行更新操作。
        //由于vue2.0的watcher维护的是组件粒度的，所以需要比较新旧两个组件的vnode的
        //diff完之后，再次更新相应的结果
        vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference
    if (prevEl) {
        prevEl.__vue__ = null
    }
    if (vm.$el) {
        vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
        vm.$parent.$el = vm.$el
        
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
}
```

* \_patch_方法，这个也是vnode相关的核心一点，即diff算法。src\core\vdom\patch.js

```js
//patch方法 即diff
                        // 老节点 当前节点，初始化标记,仅仅只是删除
return function patch (oldVnode, vnode, hydrating, removeOnly) {
    // 1.删除节点
    if (isUndef(vnode)) {//新节点不存在，因为被删除了 
        if (isDef(oldVnode)) invokeDestroyHook(oldVnode)//调用destroy钩子 删除老节点
        return
    }

    let isInitialPatch = false
    const insertedVnodeQueue = []
    //2.新增
    if (isUndef(oldVnode)) {//老节点不在，新增逻辑，直接创建新元素
        // empty mount (likely as component), create new root element
        isInitialPatch = true
        createElm(vnode, insertedVnodeQueue)
    } else {//新老都有
        const isRealElement = isDef(oldVnode.nodeType)//是元素的话，就是初始化的过程
        if (!isRealElement && sameVnode(oldVnode, vnode)) {//自定义组件，且是同一个vnode（key,tag）
            // 组件内部的children更新 ,优化部分，将新的vnode patch到旧的vnode上
            // patch existing root node 
            // 4.比对新旧节点，在旧节点上做更新
            patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
        } else {
            // 3.替换（创建新的=>替换占位符=>删除旧的）
            // 新旧不同时，就是替换现有节点
            // 组件挂载的时候，即初始化时
            if (isRealElement) {// 服务端渲染的逻辑
                // mounting to a real element
                // check if this is server-rendered content and if we can perform
                // a successful hydration.
                if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
                    /*当旧的VNode是服务端渲染的元素，hydrating记为true*/
                    oldVnode.removeAttribute(SSR_ATTR)
                    hydrating = true
                }
                if (isTrue(hydrating)) {
                    /*需要合并到真实DOM上*/
                    if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
                        invokeInsertHook(vnode, insertedVnodeQueue, true)
                        /*调用insert钩子*/
                        return oldVnode
                    } else if (process.env.NODE_ENV !== 'production') {
                        warn(
                            'The client-side rendered virtual DOM tree is not matching ' +
                            'server-rendered content. This is likely caused by incorrect ' +
                            'HTML markup, for example nesting block-level elements inside ' +
                            '<p>, or missing <tbody>. Bailing hydration and performing ' +
                            'full client-side render.'
                        )
                    }
                }
                // either not server-rendered, or hydration failed.
                // create an empty node and replace it
                /*如果不是服务端渲染或者合并到真实DOM失败，则创建一个空的VNode节点替换它*/
                oldVnode = emptyNodeAt(oldVnode)
            }

            // replacing existing element
            // 替换老的的元素
            const oldElm = oldVnode.elm //取出老的vnode中的elm
            const parentElm = nodeOps.parentNode(oldElm)//找到elm的父元素

            // create new node
            // 根据vnode创建一个新的dom
            createElm(
                vnode,
                insertedVnodeQueue,
                // extremely rare edge case: do not insert if old element is in a
                // leaving transition. Only happens when combining transition +
                // keep-alive + HOCs. (#4590)
                oldElm._leaveCb ? null : parentElm,
                nodeOps.nextSibling(oldElm)
            )
            // update parent placeholder node element, recursively
            /**
             * 更新父组件中的的占位符节点
             * 找到当前 vnode 的父的占位符节点，先执行各个 module 的 destroy 的钩子函数，
             * 如果当前占位符是一个可挂载的节点，则执行 module 的 create 钩子函数
             * cbs存放的各个module对应created，desytroy...等方法
             * 而module对应是各个属性创建、更改、删除的方法 eg:attrs,props,class,styles等属性的操作
             */
            if (isDef(vnode.parent)) {
                let ancestor = vnode.parent
                const patchable = isPatchable(vnode)
                while (ancestor) {
                    for (let i = 0; i < cbs.destroy.length; ++i) {
                        cbs.destroy[i](ancestor)//将destroy方法执行，删除父节点的所有属性
                    }
                    ancestor.elm = vnode.elm
                    if (patchable) {//可patch的
                        for (let i = 0; i < cbs.create.length; ++i) {
                            cbs.create[i](emptyNode, ancestor)//创新的属性到新节点上
                        }
                        // #6513
                        // invoke insert hooks that may have been merged by create hooks.
                        // e.g. for directives that uses the "inserted" hook.
                        const insert = ancestor.data.hook.insert
                        if (insert.merged) {//调用insert 钩子
                            // start at index 1 to avoid re-invoking component mounted hook
                            for (let i = 1; i < insert.fns.length; i++) {
                                insert.fns[i]()
                            }
                        }
                    } else {//不可patch就注册ref
                        registerRef(ancestor)
                    }
                    ancestor = ancestor.parent
                }
            }

            // destroy old node
            // 移除老的节点
            if (isDef(parentElm)) {
                removeVnodes(parentElm, [oldVnode], 0, 0)
            } else if (isDef(oldVnode.tag)) {
                // 调用老节点的destroy钩子
                invokeDestroyHook(oldVnode)
            }
        }
    }
    // 调用insert钩子
    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm
}

```

这里patch方法主要是比较新旧vnode，然而新旧vnode比对是两棵树的比较，在这里的patch比较只做同层比较。如果同一层的两个节点不一样就直接替换，如果一样，继续往下diff。

整个patch方法比较复杂，简单理一下思路。

* patch处理方式是：
  * 新节点没有，新节点有，则删除老节点
  * 老节点没有，新节点有，则新增节点
  * 新老都有，则更新节点
    * 是自定义组件，且是同一个节点，比对新老节点，在老节点上做更新
      * 新来节点没变化，则不需要更新
      * 静态节点直接复用老节点
      * 新老节点的属性更新操作
      * 新节点非文本节点即时
        * 新老节点都有子节点，更新子节点updateChildren
          * 双循环比对新老节点（会有一个递归的过程）
            * 优先比较首尾
            * 首尾四种情况不在，做双循环比对
            * 循环比对结束时，处理尚未操作的新老节点
        * 新节点有，老节点没有，直接清空老节点，并插入新节点
        * 新节点没有，老节点有，则清空老节点
        * 老节点是文本节点，而新节点没有，清空老节点
      * 当新老节点的text不同时
        * 直接设置老节点的文本内容
    * 非自定义组件或不是同一个节点，生成新节点替换老节点
* patchVnode 新老节点的比对

```js
// 自定义组件，新旧节点的比对
function patchVnode (
oldVnode,
 vnode,
 insertedVnodeQueue,
 ownerArray,
 index,
 removeOnly
) {
    if (oldVnode === vnode) {//新老vnode没变化直接返回
        return
    }

    if (isDef(vnode.elm) && isDef(ownerArray)) {
        // clone reused vnode
        vnode = ownerArray[index] = cloneVNode(vnode)
    }

    const elm = vnode.elm = oldVnode.elm

    if (isTrue(oldVnode.isAsyncPlaceholder)) {//异步组件的处理
        if (isDef(vnode.asyncFactory.resolved)) {//异步组件加载完了
            hydrate(oldVnode.elm, vnode, insertedVnodeQueue)//异步组件的初始化
        } else {
            vnode.isAsyncPlaceholder = true
        }
        return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    // 复用静态树，如果vnode没有被克隆时，说明该节点已被热启动重置。我们需要重新渲染
    // 这里主要是静态节点的处理
    // 静态节点可复用
    if (isTrue(vnode.isStatic) &&
        isTrue(oldVnode.isStatic) &&
        vnode.key === oldVnode.key &&
        (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
       ) {
        vnode.componentInstance = oldVnode.componentInstance
        return
    }

    let i
    const data = vnode.data
    // 自定义组件时执行prepatch方法 在src/core/vdom/create-component.js
    //  prepatch 方法就是拿到新的 vnode 的组件配置以及组件实例，并执行 updateChildComponent 方法 src/core/instance/lifecycle.js
    // 在updateChildComponent实际上更新vm实例上的属性，因为新的vnode是更新过的，所以vm上的$vnode,slot,listeners,props等据需要进行更新
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
        i(oldVnode, vnode)
    }

    // 获取新老节点的children
    const oldCh = oldVnode.children
    const ch = vnode.children
    // 执行所以module的update方法，即属性的更新操作，新老节点的属性更新操作
    if (isDef(data) && isPatchable(vnode)) {
        for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
        if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }
    if (isUndef(vnode.text)) {//非文本节点即有children
        if (isDef(oldCh) && isDef(ch)) {//新老都有子节点，则更新子节点，子元素更新操作
            if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
        } else if (isDef(ch)) {//新的有子节点，老的没有，新增操作
            if (process.env.NODE_ENV !== 'production') {
                checkDuplicateKeys(ch)
            }
            if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
            addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
        } else if (isDef(oldCh)) {//老的有，新的没有，删除操作
            removeVnodes(elm, oldCh, 0, oldCh.length - 1)
        } else if (isDef(oldVnode.text)) {//老的是文本节点，新的没有，则设置老节点为空
            nodeOps.setTextContent(elm, '')
        }
    } else if (oldVnode.text !== vnode.text) {//文本节点，即有text
        nodeOps.setTextContent(elm, vnode.text)//文本节点直接设置新的文本内容即可
    }
    if (isDef(data)) {
        // 调用postpatch钩子，它是组件自定义的钩子函数，有则执行
        if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
    }
}
```

* updateChildren 新老子节点的比对（树的比对）

```js
function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    let oldStartIdx = 0
    let newStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx, idxInOld, vnodeToMove, refElm

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    const canMove = !removeOnly

    if (process.env.NODE_ENV !== 'production') {
        checkDuplicateKeys(newCh)
    }
    // 双循环比较新老子节点
    // 老开小于老结束  新开小于新结束
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (isUndef(oldStartVnode)) {//老的vnode左边移除了
            oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
        } else if (isUndef(oldEndVnode)) {//老结束被移除了
            oldEndVnode = oldCh[--oldEndIdx]
        } else if (sameVnode(oldStartVnode, newStartVnode)) {//比较老开和新开，同一个节点，直接更新老节点，老开新开游标后移
            patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            oldStartVnode = oldCh[++oldStartIdx]
            newStartVnode = newCh[++newStartIdx]
        } else if (sameVnode(oldEndVnode, newEndVnode)) {//老结束和新结束，同一个节点，直接更新老结束，老结束新结束前移
            patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
            oldEndVnode = oldCh[--oldEndIdx]
            newEndVnode = newCh[--newEndIdx]
        } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right 老开和新结束同一个节点，说明老开移动末尾，直接更新老开，并且将老开移动至队列末尾
            patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)//老开的游标新增，新结束游标递减
            canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
            oldStartVnode = oldCh[++oldStartIdx]
            newEndVnode = newCh[--newEndIdx]
        } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left 老结束和新开是同一个节点，说明老结束移动至队首，知己更新老结束，并将老结束移动至队首
            patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)//老结束游标递减 新开游标递增
            canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
            oldEndVnode = oldCh[--oldEndIdx]
            newStartVnode = newCh[++newStartIdx]
        } else {//上面四种清空都不符合，老老实实的给我做双循环 
            if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
            idxInOld = isDef(newStartVnode.key)
                ? oldKeyToIdx[newStartVnode.key]
            : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)
            // 在老节点中找新开的key，如果匹配返回对应的index，没有这说明新开是新增的
            if (isUndef(idxInOld)) { // New element//没有找到相同的key
                createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
            } else {//在oldVnode中寻找能够与newStartVnode满足sameVnode的vnodeToMove，执行patchVnode
                vnodeToMove = oldCh[idxInOld]
                if (sameVnode(vnodeToMove, newStartVnode)) {//将vnodeToMove进行patch后，移动至oldStartVnode前方
                    patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
                    oldCh[idxInOld] = undefined
                    canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
                } else {//虽然key相同但是并非是sameVnode ，就创建一个新的元素
                    // same key but different element. treat as new element
                    createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
                }
            }
            newStartVnode = newCh[++newStartIdx]//不符合之前四种基础情况，新开自动加一，依次遍历
        }
    }
    if (oldStartIdx > oldEndIdx) {//老开大于老结束，这说明老的子节点遍历完成，但是新的子节点可能仍然存在没有更新的，所以此时需要将未添加的新节点一次性更新
        refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
        addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {//新开大于新结束，说要有新节点遍历完成，但是老节点中可能还存在部分元素，所以需要将这些元素一次性删除掉。
        removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
}
```



***

* stateMixin

* eventsMixin、

  * 

* lifecycleMixin

  * 

* renderMixin

  * 

  

