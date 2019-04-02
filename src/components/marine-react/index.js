import { EventEmitter } from 'events';
import {Models, $Transform, blank} from '@/components/marine-core';

export {Models, $Transform, blank};

Models.Emitter = class NodeEvent extends EventEmitter {
  constructor(...args) {
    super(...args)
    this.setMaxListeners(Infinity);
  }

  off(...args) {
    return this.removeListener(...args);
  }
}

Models.component = (config = {}) => {
  return Component => {
    const {afterCreated, beforeDestroy} = Models.componentView(
      config,
      function() {
        return this.props.name;
      },
      function() {
        return this.props.models;
      },
      function(model) {
        this.setState({model});
      }
    );
    
    // componentWillMount
    const componentWillMount = Component.prototype.componentWillMount;
    Component.prototype.componentWillMount = function() {
      afterCreated(this, componentWillMount);    
    }
    
    // componentWillUnmount
    const componentWillUnmount = Component.prototype.componentWillUnmount;
    Component.prototype.componentWillUnmount = function() {
      beforeDestroy(this, componentWillUnmount);
    }
    
    return Component;
    
  }
};

Models.inject = config => {
  return Component => {   
    const {afterCreated, beforeDestroy} = Models.modelsView(config, function(model) {
      this.setState({model});
    });
    
    // componentWillMount
    const componentWillMount = Component.prototype.componentWillMount;
    Component.prototype.componentWillMount = function() {
      afterCreated(this, componentWillMount);
    }

    // componentWillUnmount
    const componentWillUnmount = Component.prototype.componentWillUnmount;
    Component.prototype.componentWillUnmount = function() {
      beforeDestroy(this, componentWillUnmount);
    }

    return Component;
  }; 
};
