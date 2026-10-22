/*
 * dc-lite – a tiny, dependency-free runtime for the brayyn landing page.
 *
 * It renders the page template (the markup inside <template id="dc-template">)
 * with the values returned by the page's `Component.renderVals()`, and re-renders
 * whenever the component calls `setState`. Supported template syntax:
 *
 *   {{ path.to.value }}            text and attribute interpolation (dotted lookup only)
 *   <sc-for list="{{items}}" as="item">   repeat children per item ($index available)
 *   <sc-if value="{{flag}}">              render children only when truthy
 *   onClick="{{fn}}" / onChange="{{fn}}"  event handlers (onChange fires on every input)
 *
 * Updates are applied with a small in-place DOM patch, so CSS animations keep
 * running and the focused input keeps its caret while you type.
 */
(function () {
  'use strict';

  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.');
    var cur = scope;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(p, scope);
      return v == null ? '' : String(v);
    });
  }

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state, next);
    if (this.__schedule) this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () {
    if (this.__schedule) this.__schedule();
  };

  // ---------- render template -> HTML string ----------
  function renderNodes(nodes, scope, handlers) {
    var out = '';
    for (var i = 0; i < nodes.length; i++) out += renderNode(nodes[i], scope, handlers);
    return out;
  }

  function renderNode(node, scope, handlers) {
    if (node.nodeType === 3) return esc(interp(node.data, scope)).replace(/&quot;/g, '"');
    if (node.nodeType !== 1) return '';
    var tag = node.localName;

    if (tag === 'sc-for') {
      var list = lookup((node.getAttribute('list') || '').replace(/[{}]/g, ''), scope) || [];
      var as = node.getAttribute('as') || 'item';
      var html = '';
      for (var i = 0; i < list.length; i++) {
        var child = Object.create(scope);
        child[as] = list[i];
        child.$index = i;
        html += renderNodes(node.childNodes, child, handlers);
      }
      return html;
    }
    if (tag === 'sc-if') {
      var cond = lookup((node.getAttribute('value') || '').replace(/[{}]/g, ''), scope);
      return cond ? renderNodes(node.childNodes, scope, handlers) : '';
    }

    var attrs = '';
    var textareaValue = null;
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a];
      var name = at.name;
      var val = at.value;
      var lname = name.toLowerCase();
      if (lname === 'onclick' || lname === 'onchange' || lname === 'oninput') {
        var m = WHOLE.exec(val);
        var fn = m ? lookup(m[1], scope) : null;
        if (typeof fn === 'function') {
          handlers.push(fn);
          var kind = lname === 'onclick' ? 'click' : 'input';
          attrs += ' data-dc-' + kind + '="' + (handlers.length - 1) + '"';
        }
        continue;
      }
      if (tag === 'textarea' && lname === 'value') {
        textareaValue = interp(val, scope);
        continue;
      }
      attrs += ' ' + name + '="' + esc(interp(val, scope)) + '"';
    }
    var open = '<' + tag + attrs + '>';
    if (VOID[tag]) return open;
    var inner = textareaValue != null ? esc(textareaValue) : renderNodes(node.childNodes, scope, handlers);
    return open + inner + '</' + tag + '>';
  }

  // ---------- minimal in-place DOM patch ----------
  function syncAttrs(from, to) {
    var i, a;
    for (i = from.attributes.length - 1; i >= 0; i--) {
      a = from.attributes[i];
      if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
    }
    for (i = 0; i < to.attributes.length; i++) {
      a = to.attributes[i];
      if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
    }
  }

  function patch(from, to) {
    if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) {
      from.parentNode.replaceChild(to.cloneNode(true), from);
      return;
    }
    if (from.nodeType === 3 || from.nodeType === 8) {
      if (from.data !== to.data) from.data = to.data;
      return;
    }
    var isField = from.localName === 'input' || from.localName === 'textarea' || from.localName === 'select';
    var focused = isField && from === document.activeElement;
    syncAttrs(from, to);
    if (isField && !focused) {
      var v = from.localName === 'textarea' ? to.textContent : (to.getAttribute('value') || '');
      if (from.value !== v) from.value = v;
    }
    if (from.localName === 'textarea') return;
    patchChildren(from, to);
  }

  function patchChildren(from, to) {
    var a = from.childNodes;
    var b = to.childNodes;
    var i;
    for (i = 0; i < b.length; i++) {
      if (i < a.length) patch(a[i], b[i]);
      else from.appendChild(b[i].cloneNode(true));
    }
    while (a.length > b.length) from.removeChild(a[a.length - 1]);
  }

  // ---------- mount ----------
  function mount(rootEl, templateEl, ComponentClass, props) {
    var comp = new ComponentClass(props || {});
    var tpl = templateEl.content;
    var handlers = [];
    var pending = false;

    function render() {
      pending = false;
      var vals = comp.renderVals();
      var scope = Object.create(null);
      Object.keys(vals).forEach(function (k) { scope[k] = vals[k]; });
      handlers = [];
      var html = renderNodes(tpl.childNodes, scope, handlers);
      var next = document.createElement(rootEl.localName);
      next.innerHTML = html;
      patchChildren(rootEl, next);
    }

    comp.__schedule = function () {
      if (pending) return;
      pending = true;
      // A microtask batches several setState calls into one render and, unlike
      // requestAnimationFrame, keeps working in background tabs.
      Promise.resolve().then(render);
    };

    rootEl.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-dc-click]');
      if (!el || !rootEl.contains(el)) return;
      var fn = handlers[+el.getAttribute('data-dc-click')];
      if (fn) fn(e);
    });
    rootEl.addEventListener('input', function (e) {
      var el = e.target;
      if (!el.hasAttribute || !el.hasAttribute('data-dc-input')) return;
      var fn = handlers[+el.getAttribute('data-dc-input')];
      if (fn) fn(e);
    });

    render();
    if (comp.componentDidMount) comp.componentDidMount();
    return comp;
  }

  window.DCLogic = DCLogic;
  window.DCLite = { mount: mount };
})();
