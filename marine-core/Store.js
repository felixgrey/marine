let _Emitter = null;

const emitterMethods = ['on', 'once', 'emit', 'off', 'destroy'];
const statusList = ['undefined','loading','locked','set']; 

let storeKey = 1;

export default class Store {
  constructor(config) {
    if (!_Emitter) {
      throw new Error('must implement Emitter first');
    }
    
    if (!config) {
      throw new Error('store must has config');
    }
    
    Object.defineProperty(this, 'myKey', {
      value: storeKey++,
      writable: false
    });
    
    this._emitter = new _Emitter();
    this._config = config;
    this._data = {};
    this._status = {};
    this.model = {};
    this._invalid = false;
  }
  
  checkChange(newValue, oldValue) {
    return true;
  }
  
  defineModel(name, remove = false) {
    if (this._invalid) {
      return;
    }
    
    if (remove && this.model.hasOwnProperty(name)) {
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
    
    this._data[name] = [];
    
    Object.defineProperty(this.model, name, {
      get:() => {
        if(this._invalid) {
          return;
        }
        return this._data[name][0]
      },
      set: (newValue) => {
        if(this._invalid) {
          return;
        }
        const oldValue = this._data[name][0];
        if (typeof newValue === 'function') {
          newValue = newValue(oldValue);
        }
        if(this.checkChange(newValue, oldValue)){
          this._data[name][0] = newValue;
          if(this._status[name] !== 'set') {
            this._status[name] = 'set';
            this._emitter.emit(`$statusChange:${name}`);
          }          
          this._emitter.emit(`$dataChange:${name}`);
        }
      }
    });
    
    Object.defineProperty(this.model, `${name}List`, {
      get:() => {
        if(this._invalid) {
          return;
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
        if(this.checkChange(newValue, oldValue)){
          this._data[name] = newValue;
          if(this._status[name] !== 'set') {
            this._status[name] = 'set';
            this._emitter.emit(`$statusChange:${name}`);
          }
          this._emitter.emit(`$dataChange:${name}`);
        }
      }
    });
    
    Object.defineProperty(this.model, `${name}Status`, {
      get:() => {
        if(this._invalid) {
          return;
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
          this._emitter.emit(`$statusChange:${name}`);
        }
      }
    });   
  }
  
  createController(ExtendController = Controller) {
    if(this._invalid) {
      return;
    }
    const controller = new ExtendController(this);
    this._controllers.push(controller);
    return controller;
  }
  
  destroy() {
    if(this._invalid) {
      return;
    }
    this._invalid = true;
    this._emitter.emit('$storeDestroy');
    this._emitter.destroy();
    this._emitter = null;
    this._config  = null;
    this._data  = null;
    this._status = null;
    this.model = null;
  } 
}

Store.fetch = () => {};

Object.defineProperty(Store, 'Emitter', {
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
    
    Object.defineProperty(Store, 'commonStore', {
      value: new Store({}),
      writable: false
    });
  },
  get: () => {
    return _Emitter;
  }
});
