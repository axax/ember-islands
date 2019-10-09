import Ember from 'ember';

const {$, Component, getOwner, Logger} = Ember;

export default Ember.Component.extend({
  tagName: '',

  init() {
    this._super(...arguments);
    this.renderComponent = getRenderComponentFor(this);
    this.componentsToRender = queryIslandComponents();
    this.renderedComponents = [];
  },

  didInsertElement() {
    this.componentsToRender.map(this.renderComponent);
  },

  willDestroyElement() {
    this.renderedComponents.forEach((renderedComponent) => {
      renderedComponent.destroy();
    });
  }
});

function componentAttributes(element) {
  let attrs;
  let attrsJSON = element.getAttribute('data-attrs');

  if (attrsJSON) {
    attrs = JSON.parse(attrsJSON);
  } else {
    attrs = {};
  }

  attrs.innerContent = element.innerHTML;
  return attrs;
}

function getRenderComponentFor(emberObject) {
  let owner = getOwner(emberObject);

  return function renderComponent({name, attrs, delay, element}) {
    let {component, layout} = lookupComponent(owner, name);
    Ember.assert(missingComponentMessage(name), component);
    // This can only be true in production mode where assert is a no-op.
    if (!component) {
      ({component, layout} = provideMissingComponentInProductionMode(owner, name));
    }

    if (layout) {
      attrs.layout = layout;
    }

    function getComponentInstance() {

      $(element).empty();
      let componentInstance = component.create(attrs);
      componentInstance.appendTo(element);

      return componentInstance;
    }

    //console.log(delay, component)
    if ( !isNaN(delay) && delay > 0) {

      setTimeout(function () {
        emberObject.renderedComponents.push(getComponentInstance());
      }, delay)
    }else {
      emberObject.renderedComponents.push(getComponentInstance());
    }
  };
}

let componentsNr = 0;

function queryIslandComponents() {
  let components = [];

  $('[data-component]').each(function () {
    let name = this.getAttribute('data-component');
    let attrs = componentAttributes(this);


    let dataDelay = this.getAttribute('data-delay');
    let delay;
    if (dataDelay) {
      delay = parseInt(dataDelay);
    }else{
      delay = componentsNr*500;
      if( componentsNr < 5) {
        componentsNr++;
      }
    }
    components.push({attrs, delay, name, element: this});
  });

  return components;
}

function lookupComponent(owner, name) {
  let componentLookupKey = `component:${name}`;
  let layoutLookupKey = `template:components/${name}`;
  let layout = owner._lookupFactory(layoutLookupKey);
  let component = owner._lookupFactory(componentLookupKey);

  if (layout && !component) {
    owner.register(componentLookupKey, Component);
    component = owner._lookupFactory(componentLookupKey);
  }

  return {component, layout};
}

function missingComponentMessage(name) {
  return `ember-islands could not find a component named "${name}" in your Ember application.`;
}

function provideMissingComponentInProductionMode(owner, name) {
  Logger.error(missingComponentMessage(name));

  return lookupComponent(owner, 'ember-islands/missing-component');
}
