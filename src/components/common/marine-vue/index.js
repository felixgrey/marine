import {Models, $Transform, blank, noValue} from '@/components/marine-core';
import $ from 'jquery';

export {Models, $Transform, blank, noValue};

// 随机函数名
const _callback =`_wrapedEmitterCallback${Date.now()}`;

// jquery实现事件发射器
Models.Emitter= class JqEvent {
  constructor(){
    this.core = $({});
  }
  // callback匹配jquery参数格式
  _wrapedCallback(callback){
    const warpedCallback = (jqEvt) => {
      return callback(...jqEvt.femData);
    }
    callback[_callback] = warpedCallback;
    return warpedCallback;
  }
  // 监听事件
  on(name, callback) {     
    this.core.on(name, this._wrapedCallback(callback));
  }
  // 一次性监听
  once(name, callback) {
    this.core.one(name, this._wrapedCallback(callback));
  }
  // 发射事件
  emit(name, ...femData) {
    this.core.trigger({type:name, femData});
  }
  // 解除监听
  off(name, callback) {
    this.core.off(name, callback[_callback]);
  }
};

Models.component = (config = {}) => {
  return Component => {
    if(typeof Component === 'function'){
      Component = new Component().vue || {};
    }
    
    const {afterCreated, beforeDestroy} = Models.componentView(
      config,
      function() {
        return this.name;
      },
      function() {
        return this.models;
      },
      function(model) {
        this.model = model;
      }
    );
    
    // created
    const created = Component.created;
    Component.created = function() {
      afterCreated(this, created);    
    }
    
    // beforeDestroy
    const _beforeDestroy = Component.beforeDestroy;
    Component.beforeDestroy = function() {
      beforeDestroy(this, _beforeDestroy);
    }
    
    // props
    const props = Component.props = Component.props || {};
    props.name = {type: String};
    props.models = {type: Object};
    
    // data
    const oldData = Component.data || blank;
    if(typeof oldData === 'function') {
      Component.data = function (){
        const result = {...oldData.bind(this)(), model:{}};
        return result;
      }
    } else {
      Component.data = {...oldData, model:{}};
    }
    
    return Component;
    
  }
}

Models.inject = config => {
  return Component => {   
    if(typeof Component === 'function'){
      Component = new Component().vue || {};
    }

    const {afterCreated, beforeDestroy} = Models.modelsView(config, function(model) {
      this.model = model;
    });
    
    // created
    const created = Component.created;
    Component.created = function() {
      afterCreated(this, created);
    }

    // beforeDestroy
    const _beforeDestroy = Component.beforeDestroy;
    Component.beforeDestroy = function() {
      beforeDestroy(this, _beforeDestroy);
    }

    // data
    const oldData = Component.data || blank;
    if(typeof oldData === 'function') {
      Component.data = function (){
        const result = {...oldData.bind(this)(), model:{}};
        return result;
      }
    } else {
      Component.data = {...oldData, model:{}};
    }
    
    return Component;
  }; 
}


