/**
 * 设置obj为响应式
 * @param {Object} obj 
 */
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

