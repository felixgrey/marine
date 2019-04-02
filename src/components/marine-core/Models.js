let _Emitter = null;

const emitterMethods = ['on', 'once', 'emit', 'off'];
const statusList = ['undefined', 'loading', 'locked', 'set']; 

let modelsKey = 1;

export function noValue(value) {
  return value === null || value === undefined;
}

export function blank(){}

let errorLog = blank;
let console = (global || {}).console;
if (process && process.env && process.env.NODE_ENV === 'development' && console && typeof console.error === 'function') {
  errorLog = function(...args){console.error('【marine-WARING】:', ...args)};
}

const stopRun = Math.random() * 10e6;
export {
  errorLog,
  stopRun
};

export class Executor {
  constructor() {
    this._invalid = false;
    this._before = {};
    this._after = {};
    this._runner = {};
  }
  
  runner(name, fun) {
    if (this._invalid || noValue(name) || this._runner[name]) {
      return;
    }
    
    if(fun === false) {
      delete this._before[name];
      delete this._after[name];
      delete this._runner[name];
      return;
    }
    
    this._runner[name] = fun;
  }
  
  before(name, fun) {
    if (this._invalid || noValue(name) || !this._runner[name]) {
      return;
    }
    
    this._before[name] = this._before[name] || [];
    this._before[name].push(fun);
    
    return () => {
      if (this._invalid || !this._before[name]) {
        return;
      }
      const i = this._before[name].indexOf(fun);
      if(i !== -1){
        this._before[name].selice(i, 1);
      }
    }
  }
  
  after(name, fun) {
    if (this._invalid || noValue(name) || !this._runner[name]) {
      return;
    }
    
    this._after[name] = this._after[name] || [];
    this._after[name].push(fun);
    
    return () => {
      if (this._invalid || !this._after[name]) {
        return;
      }
      const i = this._after[name].indexOf(fun);
      if(i !== -1){
        this._after[name].selice(i, 1);
      }
    }
  }
  
  run(name, ...args){
    if (this._invalid || noValue(name) || !this._runner[name]) {
      return;
    }
    
    const befores = this._before[name] || [];
    let newArgs = args;
    for (let before in befores) {
      newArgs = before(newArgs, args);
      if(newArgs === stopRun) {
        return stopRun;
      }
    }
    
    const result = this._runner[name](...newArgs);
    const afters = this._after[name] || [];
    let newResult = result
    for (let after in afters) {
      newResult = after(newResult, result, newArgs, args);
    }
    
    return newResult;
  }
  
  destroy(name) {
    if (this._invalid || noValue(name)) {
      return;
    }
    this._invalid = true;
    this._before = null;
    this._after = null;
    this._runner = null;
  }
}

class Controller {
  constructor(_models) {
    this._models = _models;
    this._emitter = _models._emitter;
    this._invalid = false;
    this._offList = [];
    this._runnerList = [];
  }
  
  destroy() {
    if (this._invalid) {
      return;
    }
    this._invalid = true;
    clearTimeout(this._watchTimeoutIndex);   
    this._offList.forEach(off => off());
    this._runnerList.forEach(name => {
       this._models._executor.runner(name, false);
    });    
    this._runnerList = null;
    this._offList = null;
    this._models = null;
    this._emitter = null;
  }
  
  run(name, ...args) {
    if (this._invalid) {
      return;
    }
    return this._models._executor.run(name, ...args);
  }
  
  runner = (name, callback) => {
    if (this._invalid) {
      return;
    }
    this._runnerList.push(name);
    this._models._executor.runner(name, callback);
  }
  
  on = (name, callback) => {
    if (this._invalid) {
      return;
    }
    this._emitter.on(name, callback);
    return () => {
      this._emitter.off(name, callback);
    }
  }
  
  once = (name, callback) => {
    if (this._invalid) {
      return;
    }
    this._emitter.once(name, callback);
    return () => {
      this._emitter.off(name, callback);
    }
  }
  
  watch = (callback, _once = false) => {
    if (this._invalid) {
      return;
    }
    let fun = _once ? 'once' : 'on';
    
    const onChange = () => {
      if (this._invalid) {
        return;
      }
      clearTimeout(this._watchTimeoutIndex);
      this._watchTimeoutIndex = setTimeout(() => {
        callback(this.getModel());
      }, 20);  
    };

    this[fun]('$dataChange', onChange);
    this[fun]('$statusChange', onChange);
    
    callback(this.getModel());
  }
  
  getModel() {
    return Object.freeze({...this._models.model});
  }
  
  isNotAble = list => {
    if (this._invalid) {
      return;
    }
    return ([].concat(list)).reduce((a, b) => (a || this._models.model[`${b}Status`] !== 'set'), false);
  }
  
  when = (name, callback, _once = false) => {
    if (this._invalid) {
      return;
    }
    
    if(Array.isArray(name)) {
      let offList = [];
      
      const wrapedCallback = () => {
        let ready = true;
        let modelList = [];
        
        for (let _name of name) {
          if (this._models.model[`${_name}Status`] !== 'set') {
            ready = false;
            break;
          }
          
          modelList.push({
            model: this._models.model[_name],
            list: this._models.model[`${_name}List`]
          });
        }
        
        if(ready) {
          callback(modelList);
        }
      };
      
      name.forEach(_name => {
        offList.push(this._when(_name, wrapedCallback, _once));
      });
      
      return () => {
        offList && offList.forEach(off => off());
        offList = null;
      };
    }
    
    return this._when(name, callback, _once);
  }
  
  _when = (name, callback, _once = false)  => {
    if (this._invalid) {
      return;
    }
    let fun = _once ? 'once' : 'on';
    
    const wrapedCallback = () => {
      if (this._invalid) {
        return;
      }
      callback({
        model: this._models.model[name],
        list: this._models.model[`${name}List`]
      });
    }
    
    if (this._models.model[`${name}Status`] === 'set') {
        wrapedCallback();
        if (_once) {
          return blank;
        }
    }

    return this[fun](`$dataChange:${name}`, wrapedCallback);
  }
  
  load = (name, callback)  => {
    return this.when(name, callback, true);
  }

  submit = (...args)  => {
    if (this._invalid) {
      return;
    }
    return this._models._submit(...args);
  }
  
  fitlerModel(filter = () => true) {
    if (this._invalid) {
      return;
    }
    const {modelNames, _config} = this._models;
    return modelNames.map(name => _config[name]).filter(model => filter(model));
  }
}

export default class Models {
  constructor(config) {
    if (!_Emitter) {
      throw new Error('must implement Emitter first');
    }
    
    if (!config) {
      throw new Error('store must has config');
    }
    
    if (config.$singleFetch === false) {
      this._singleFetch = false;
    } else {
      this._singleFetch = true;
    }
    
    Object.defineProperty(this, 'myKey', {
      value: modelsKey++,
      writable: false
    });
    
    this._fetchIndex = {};  
    this._lagFetchTimeoutIndex = {};
    this.model = {};
    this.modelNames = [];
    
    this._executor = new Executor();
    
    this._emitter = new _Emitter();
    this._config = config;
    
    this._data = {};
    this._status = {};
   
    this._invalid = false;
    this.myController = this.controller();
    
    this._init(config);
  }
  
  _init(config) {
    const {when} = this.myController;
    
    for (let modelName in config) {
      if (/^\$|^_/g.test(modelName)) {
        continue;
      }      
      this.defineModel(modelName);
      this.modelNames.push(modelName);
      
      let {
        type,
        default: _default,
        clear,
        reset,
        snapshot,
        filter = [],
        dependence = []
      } = config[modelName];
      
      if (!noValue(clear)) {
        clear = [].concat(clear);
        clear.forEach(name => {
          when(name, () => {
            this.model[`${modelName}List`] = [];
          })
        })      
      }
      
      if (!noValue(reset)) {
        reset = [].concat(reset);
        reset.forEach(name => {
          when(name, () => {
            this.model[`${modelName}List`] = !noValue(_default) ? [].concat(_default) : []
          })
        })      
      }
      
      if (!noValue(snapshot)) {
        snapshot = [].concat(snapshot);
        snapshot.forEach(name => {
          when(name, () => {
            this.model[`${modelName}List`] =JSON.parse(JSON.stringify(this.model[`${name}List`]));
          })
        })      
      }
      
      if (!noValue(type)) {
        
        const submitCallback = () => {
          const paramModel = {};
          const params = {};
          
          for (let fName of filter) {
            paramModel[fName] = this.model[fName];
            Object.assign(params, this.model[fName]);
          }
          
          for (let dName of dependence) {
            if(this.model[dName] === undefined ) {
              if(!noValue(this.model[modelName])){
                this.model[`${modelName}List`] = [];
              }
              return;
            }
            paramModel[dName] = this.model[dName];
            Object.assign(params, this.model[dName]);
          }

          clearTimeout(this._lagFetchTimeoutIndex[modelName]);
          this._lagFetchTimeoutIndex[modelName] = setTimeout(() => {
            if (this._invalid) {
              return;
            }
            if (this._singleFetch && this.model[`${modelName}Status`] === 'loading') {
              errorLog(`can not fetch ${modelName} when it is loading`);
              return;
            }
            this.model[`${modelName}Status`] = 'loading';
            
            if(!this._fetchIndex[modelName]){
              this._fetchIndex[modelName] = 0;
            }
            this._fetchIndex[modelName]++;
            const myRequestIndex = this._fetchIndex[modelName];
            
            Promise.resolve(this._fetch(type, {
                type,
                params,
                paramModel,
                model: this.model[modelName],
                modelList: this.model[`${modelName}List`]
              })
            ).then((newModel) => {
              if (this._invalid) {
                return;
              }
              if(myRequestIndex !== this._fetchIndex[modelName]) {
                return;
              }
              if(newModel === undefined){
                throw new Error(`${modelName} can not be undefined`);
              }
              this.model[`${modelName}List`] = [].concat(newModel);
            }).catch((e) => {
              if (this._invalid) {
                return;
              }
              this.model[`${modelName}Status`] = 'set';
              throw new Error(e);
            });
          }, 20);
        }

        const watchList = dependence.concat(filter);
        
        watchList.forEach(_name => {
          this.defineModel(_name);
          when(_name, submitCallback);
        });
        submitCallback();
        
      } else if (_default !== undefined) {
        this.model[`${modelName}List`] = [].concat(_default);
      }
    }
  }
  
  _fetch(name, ...args) {
    return Models.globalModels._executor.run(name, ...args);
  }
  
  _submit(param) {
    if (this._invalid) {
      return;
    }
    
    const {
      type,
      params = {},
      lock = [],
      data = {}
    } = param;
    
    const oldList = lock.map(name => {  
      const nameStatus = `${name}Status`;
      const old = this.model[nameStatus];
      this.model[nameStatus] = 'locked';
      return {old, nameStatus };
    });
    
    const oldCallback = () => {
      oldList.forEach(({old, nameStatus}) => {
        this.model[nameStatus] = old;
      });
    }
    
    return Promise.resolve(this._fetch(type, {
      type,
      params,
      _submit: true,
      model: data,
      modelList: [].concat(data)
    })).then(result => {
      oldCallback();
      return result;
    }).catch(e => {
      oldCallback();
      throw new Error(e);
    });
  }
  
  _checkChange() {
    return true;
  }

  defineModel(name, value, def = true) {
    if (this._invalid) {
      return;
    }
    
    if (!def && this.model.hasOwnProperty(name)) {
      this._emitter.emit(`$modelRemoved:${name}`);
      delete this.model[name];
      delete this.model[`${name}List`];
      delete this.model[`${name}Status`];
      delete this._data[name];
      return;
    }
    
    if (this.model.hasOwnProperty(name)) {
      return;
    }
    
    this._data[name] = (value === undefined) ? []: [].concat(value);
    
    Object.defineProperty(this.model, name, {
      enumerable: true,
      get: () => {
        if(this._invalid) {
          return undefined;
        }
        const value = this._data[name][0];
        return  noValue(value) ? {} : value;
      },
      set: (newValue) => {
        if(this._invalid) {
          return undefined;
        }
        if(newValue === undefined) {
          throw new Error(`${name} can not be undefined`);
        }
        const oldValue = this._data[name][0];
        if (typeof newValue === 'function') {
          newValue = newValue(oldValue);
        }
        if(this._checkChange(newValue, oldValue)){
          this._data[name][0] = newValue;
          if(this._status[name] !== 'set') {
            this._status[name] = 'set';
            this._emitter.emit(`$statusChange`);
            this._emitter.emit(`$statusChange:${name}`);
          }
          this._emitter.emit(`$dataChange`);
          this._emitter.emit(`$dataChange:${name}`);
        }
      }
    });
    
    Object.defineProperty(this.model, `${name}List`, {
      enumerable: true,
      get: () => {
        if(this._invalid) {
          return undefined;
        }
        return this._data[name];
      },
      set: (newValue) => {
        if(this._invalid) {
          return;
        }     
        if(newValue === undefined) {
          throw new Error(`${name}List can not be undefined`);
        }
        const oldValue = this._data[name];
        if (typeof newValue === 'function') {
          newValue = newValue(oldValue);
        }
        if(this._checkChange(newValue, oldValue)){
          this._data[name] = newValue;
          if(this._status[name] !== 'set') {
            this._status[name] = 'set';
            this._emitter.emit(`$statusChange`);
            this._emitter.emit(`$statusChange:${name}`);
          }
          this._emitter.emit(`$dataChange`);
          this._emitter.emit(`$dataChange:${name}`);
        }
      }
    });
    
    Object.defineProperty(this.model, `${name}Status`, {
      enumerable: true,
      get: () => {
        if(this._invalid) {
          return 'undefined';
        }
        return this._status[name] || 'undefined';
      },
      set: (newStatus) => {
        if(this._invalid) {
          return;
        }
        if(statusList.indexOf(newStatus) === -1) {
          throw new Error(`${name}Status must one of ${statusList.join(',')}`);
        }
        const oldStatus = this._status[name];
        if(oldStatus !== newStatus){
          this._status[name] = newStatus;
          this._emitter.emit(`$statusChange`);
          this._emitter.emit(`$statusChange:${name}`);
        }
      }
    });   
  }
  
  controller() {
    if(this._invalid) {
      return;
    }
    return new Controller(this);
  }
  
  destroy() {
    if(this._invalid) {
      return;
    }
    this._invalid = true;
    Object.keys(this._lagFetchTimeoutIndex).forEach(index => {
      clearTimeout(index);
    });
    this._emitter.emit('$storeDestroy');
    this._emitter.destroy();
    this._executor.destroy();
    this._executor = null;
    this._emitter = null;
    this._config  = null;
    this._data  = null;
    this._status = null;
    this._fetchIndex = null;
    this.model = null;
    this.modelNames = null;
    this._lagFetchTimeoutIndex = null;
  } 
}

Models.inject = () => blank;
Models.component = () => blank;

Models.componentView = (config = {}, getName = () => blank,getModels = () => blank, setModel = () => blank) => {
  return {
    afterCreated: (that, afterCreated) => {
      const models = getModels.call(that);
      if(!models) {
       throw new Error('props of component need models');
      }
      that.$Name = getName.call(that)  ;
      that.$Name = noValue(that.$Name) ? '' : that.$Name;
      that.$Models = models;
      that.$Controller = that.$Models.controller();
      that.$Run = (...args) => {return that.$Controller.run(...args)};
      that.$Submit = (...args) => {return that.$Controller.submit(...args)};
      that.$Model = that.$Models.model; 
      that.$Controller.watch((model) => setModel.call(that, model));
      afterCreated && afterCreated.apply(that);
      if (config.runner) {
        if(noValue(config.namespace)){
          throw new Error('runner need namespace');
        }
        Object.keys(config.runner).forEach((name) => {
          that.$Controller.runner(`${config.nameSpace}.${name}:${that.$Name}`, config.runner[name]);
        });
      }     
    },
    beforeDestroy: (that, beforeDestroy) => {
      beforeDestroy && beforeDestroy.apply(this);     
      that.$Controller && that.$Controller.destroy();
      that.$Controller = null;
      that.$Models = null;
      that.$Model = null;
    }
  }
};

Models.modelsView = (config = {}, setModel = () => blank) => {
  return {
    afterCreated: (that, afterCreated) => {
      that.$Models = new Models(config);
      that.$Controller = that.$Models.controller();
      that.$Run = (...args) => {return that.$Controller.run(...args)};
      that.$Submit = (...args) => {return that.$Controller.submit(...args)};
      that.$Model = that.$Models.model; 
      that.$Controller.watch((model) => setModel.call(that, model));    
      afterCreated && afterCreated.apply(that);
    },
    beforeDestroy: (that, beforeDestroy) => {
      beforeDestroy && beforeDestroy.apply(that);
      that.$Models.destroy();
      that.$Models = null;
      that.$Controller = null;
      that.$Model = null;
    }
  }
};

Object.defineProperty(Models, 'Emitter', {
  set: (Emitter) => {
    if(_Emitter) {
      throw new Error('Emitter has implemented');
    }
    
    const _pe = Emitter.prototype;
    emitterMethods.forEach(name => {
      if(typeof _pe[name] !== 'function'){
        throw new Error(`Emitter must implement ${emitterMethods.join(',')}`);
      }
    });
    
    _Emitter = Emitter;
    
    Object.defineProperty(Models, 'globalModels', {
      value: new Models({}),
      writable: false
    });
    
    Models.globalRunner = (...args) => Models.globalModels._executor.runner(...args);  
  },
  get: () => {
    return _Emitter;
  }
});

