const _View = null;

const viewMethods = ['init', 'ready', 'change', 'destroy'];

let agentKey = 1;
export default class Agent {
  constructor(option) {
    if (!_View) {
      throw new Error('must implement View first');
    }
    
    Object.defineProperty(this, 'myKey', {
      value: agentKey++,
      writable: false
    });
  }
}

const declardAgent = {};

Agent.declare = function(name) {
  if(declardAgent[name]){
    throw new Error(`Agent ${name} has declared`);
  }
  return function(Agent) {
    declardAgent[name] = Agent;
  };
}

Agent.component = function(name, option) {
  if(typeof name === 'object') {
    option = name;
    name = null;
  }
  
  let agent = null;

  return function(View) {
    return new View(agent);
  }
}

Object.defineProperty(Agent, 'View', {
  set:(View) => {
    if(_View) {
      throw new Error('View has implemented');
    }
    
    const _pe = View.prototype;
    viewMethods.forEach(name => {
      if(typeof _pe[name] !== 'function'){
        throw new Error(`View must implement ${viewMethods.join(',')}`);
      }
    });
    
    _View = View;
  },
  get: () => {
    return _View;
  }
})
