function isArray (o) {
  return Object.prototype.toString.call(o) === '[object Array]'
}
function isObject (o) {
  return Object.prototype.toString.call(o) === '[object Object]'
}
function isFunction (o) {
  return Object.prototype.toString.call(o) === '[object Function]'
}
function isString (o) {
  return Object.prototype.toString.call(o) === '[object String]'
}
function isBoolean (o) {
  return Object.prototype.toString.call(o) === '[object Boolean]'
}
function isNumber (o) {
  return Object.prototype.toString.call(o) === '[object Number]'
}
function isNull (o) {
  return Object.prototype.toString.call(o) === '[object Number]'
}
function isUndefined (o) {
  return Object.prototype.toString.call(o) === '[object Undefined]'
}
function kebabToCamelCase (s) {
  var reg = /(^|-)(\w)/g
  return s.replace(reg, function($, $1, $2){
    return $2.toUpperCase()
  })
}
function canShowDirectlyType (o) {
  return isString(o) || isBoolean(o) || isNumber(o) || isNull(o) || isUndefined(o)
}
function isHTMLElement (o) {
  return o.nodeType && o.nodeType === 1
}
let tagsString = 'html,body,base,head,link,meta,style,title,' +
  'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
  'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
  'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
  's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
  'embed,object,param,source,canvas,script,noscript,del,ins,' +
  'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
  'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
  'output,progress,select,textarea,' +
  'details,dialog,menu,menuitem,summary,' +
  'content,element,shadow,template,blockquote,iframe,tfoot'
let tagNameMap = tagsString.split(',').reduce(function (acc, tagName) {
  acc[tagName] = true
  return acc
}, {})
function isReservedTag (tagName) {
  return tagNameMap[tagName]
}
function ViewComponent (options) {
  this.el = options.el ? document.querySelector(options.el) : undefined
  this.propOptions = options.props
  this.data = options.data
  this.methods = options.methods
  this.render = options.render
  this.components = options.components
  this.$options = options
  this.renderedElement = null
  this.$parent = options.$parent || null
  this.init()
}
ViewComponent.prototype.init = function () {
  this.initProps()
  this.initData()
  this.initMethods()
  this.initEvents()

  this.renderAndCollectDependencies()
}
ViewComponent.prototype.initProps = function () {
  if (!this.propOptions) return
  let keys = Object.keys(this.propOptions)
  let propsData = this.$options.propsData
  this.props = {}
  for (let i = 0; i < keys.length; i++) {
    this.props[keys[i]] = propsData[keys[i]] !== undefined ? propsData[keys[i]] : this.propOptions[keys[i]].default
    setProxy(this, 'props', keys[i])
  }
  setDataReactive(this.props)
}
ViewComponent.prototype.initData = function () {
  let data = isFunction(this.data) ? this.data.call(this) : this.data
  let keys = Object.keys(data)
  this.data = data
  for (let i = 0; i < keys.length; i++) {
    setProxy(this, 'data', keys[i])
  }
  setDataReactive(this.data)
}
ViewComponent.prototype.initMethods = function () {
  let keys = Object.keys(this.methods)
  for (let i = 0; i < keys.length; i++) {
    this[keys[i]] = this.methods[keys[i]]
  }
}
ViewComponent.prototype.initEvents = function () {
  let events = this.$options.parentListeners
  if (!events) return

  let keys = Object.keys(events)
  this.events = {}
  for (let i = 0; i < keys.length; i++) {
    this.events[keys[i]] = events[keys[i]]
  }
}
ViewComponent.prototype.renderAndCollectDependencies = function () {
  this.update = this.update.bind(this)
  this.update()
  let fn = this.$options.mounted
  if (fn && isFunction(fn)) {
    fn.call(this)
  }
}
ViewComponent.prototype.update = function () {
  // 清除旧的DOM
  let oldRenderedElement = this.renderedElement || this.el

  this.renderedElement = this._render()
  if (oldRenderedElement) {
    let parent = oldRenderedElement.parentNode
    let sibling = oldRenderedElement.nextElementSibling
    parent.removeChild(oldRenderedElement)
    if (!this.renderedElement) return
    if (sibling) {
      parent.insertBefore(this.renderedElement, sibling)
    } else {
      parent.appendChild(this.renderedElement)
    }
  }
}
ViewComponent.prototype._render = function () {
  pushCurExecUpdateToStack(this.update)
  let renderedElement = this.render()
  popCurExecUpdateFromStack()
  return renderedElement
}
ViewComponent.prototype.createElement = function (tagName, attrs, childNodes) {
  if (isReservedTag(tagName)) {
    return createHTMLElement(this, tagName, attrs, childNodes)
  } else if (isValidComponent(this, tagName)) {
    return createComponent(this, tagName, attrs, childNodes)
  }
}
ViewComponent.prototype.notifyParent = function (eventName, args) {
  if (this.events && this.events[eventName]) {
    this.events[eventName].apply(this.$parent, args)
  }
}
function createHTMLElement (vm, tagName, attrs, childNodes) {
  if (tagName === '') return document.createTextNode(childNodes)
  let o = document.createElement(tagName)
  for (let k in attrs) {
    if (k === 'class') {
      o.className = attrs.class
    } else if (k === 'on') {
      let events = attrs.on
      let eventKeys = Object.keys(events)
      for (let i = 0; i < eventKeys.length; i++) {
        let eventName = eventKeys[i]
        events[eventName] = events[eventName].bind(vm)
        o.addEventListener(eventName, events[eventName])
      }
    }
  }
  if (!childNodes) return o
  if (isArray(childNodes)) {
    for (let i = 0; i < childNodes.length; i++) {
      let child = childNodes[i]
      child && o.appendChild(isHTMLElement(child) ? child : createHTMLElement(vm, '', {}, child))
    }
  } else if (isHTMLElement(childNodes)) {
    o.appendChild(childNodes)
  } else if (canShowDirectlyType(childNodes)) {
    o.appendChild(document.createTextNode(childNodes))
  }
  return o
}

function isValidComponent (vm, tagName) {
  let normalizedComponentName = kebabToCamelCase(tagName)
  return vm.components[normalizedComponentName]
}

function createComponent (vm, tagName, attrs, childNodes) {
  let normalizedComponentName = kebabToCamelCase(tagName)
  let componentOptions = vm.components[normalizedComponentName] || {}
  let propsData = attrs.props
  let events = attrs.on

  componentOptions.propsData = propsData
  componentOptions.parentListeners = events
  componentOptions.$parent = vm
  let componentInstance = new ViewComponent(componentOptions)
  return componentInstance.renderedElement
}

function setDataReactive (data) {
  let keys = Object.keys(data)
  for (let i = 0; i < keys.length; i++) {
    let v = data[keys[i]]
    if (isObject(v)) {
      setDataReactive(v)
    }
    defineReactive(data, keys[i], v)
  }
}

let curExecUpdate = null
function defineReactive(data, key, val) {
  let updateFns = []
  Object.defineProperty(data, key, {
    enumerable: true,
    configurable: true,
    get: function () {
      if (curExecUpdate && !updateFns.find(fn => fn === curExecUpdate)) {
        updateFns.push(curExecUpdate)
      }
      return val
    },
    set: function (newVal) {
      val = newVal
      if (isObject(newVal) || isArray(newVal)) {
        setDataReactive(newVal)
      }
      for (let i = 0; i < updateFns.length; i++) {
        updateFns[i]()
      }
    }
  })
}
function setProxy(target, sourceKey, key) {
  Object.defineProperty(target, key, {
    enumerable: true,
    configurable: true,
    get: function () {
      return target[sourceKey][key]
    },
    set: function (v) {
      target[sourceKey][key] = v
    }
  })
}
let updateStack = []
function pushCurExecUpdateToStack (fn) {
  updateStack.push(fn)
  curExecUpdate = fn
}

function popCurExecUpdateFromStack () {
  updateStack.pop()
  curExecUpdate = updateStack[updateStack.length - 1]
}
