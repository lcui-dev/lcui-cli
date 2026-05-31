import test from "node:test";
import assert from "node:assert/strict";
import {
  Text,
  TextInput,
  Link,
  Button,
  Widget,
  Scrollbar,
  ScrollArea,
  ScrollAreaContent,
  RouterLink,
  RouterView,
} from "../lib/widgets.js";

const tagCases = [
  ["Text", Text, "text"],
  ["TextInput", TextInput, "textinput"],
  ["Link", Link, "a"],
  ["Button", Button, "button"],
  ["Widget", Widget, "widget"],
  ["Scrollbar", Scrollbar, "scrollbar"],
  ["ScrollArea", ScrollArea, "scrollarea"],
  ["ScrollAreaContent", ScrollAreaContent, "scrollarea-content"],
  ["RouterView", RouterView, "router-view"],
];

for (const [name, component, tag] of tagCases) {
  test(`${name} maps to ${tag} and keeps shouldPreRender`, () => {
    const el = component({ id: `${name}-id` });
    assert.equal(el.type, tag);
    assert.equal(el.props.id, `${name}-id`);
    assert.equal(component.shouldPreRender, true);
  });
}

test("RouterLink maps props for router-link", () => {
  const el = RouterLink({
    to: "/foo",
    exact: true,
    activeClass: "active",
    exactActiveClass: "exact-active",
    id: "router-link",
  });
  assert.equal(el.type, "router-link");
  assert.equal(el.props.to, "/foo");
  assert.equal(el.props.exact, "exact");
  assert.equal(el.props["active-class"], "active");
  assert.equal(el.props["exact-active-class"], "exact-active");
  assert.equal(el.props.id, "router-link");
  assert.equal(RouterLink.shouldPreRender, true);
});
