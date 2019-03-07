import Agent from './Agent';

Agent.store = function(config, option = {}) {
  return function(clazz) {
    option.$storeConfig = config;
    return Agent.component('$Store', option);
  }
}

export default Agent;