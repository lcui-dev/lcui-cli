import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import compile from "../lib/compiler/compile.js";

function TestComponent1() {
  return React.createElement(
    "widget",
    { id: "root" },
    React.createElement(
      React.Fragment,
      null,
      React.createElement("text", null, "hello"),
      React.createElement("text", null, "world")
    )
  );
}

test("Fragment children are flattened into siblings", () => {
  const result = compile(TestComponent1, {}, { target: "Widget" });
  const root = result.node;
  assert.equal(root.name, "widget");
  assert.equal(root.children.length, 2);
  assert.equal(root.children[0].name, "text");
  assert.equal(root.children[0].text, "hello");
  assert.equal(root.children[1].name, "text");
  assert.equal(root.children[1].text, "world");
});

function TestComponent2() {
  return React.createElement(
    "widget",
    { id: "root" },
    React.createElement("text", null, "before"),
    React.createElement(
      React.Fragment,
      null,
      React.createElement("text", null, "a"),
      React.createElement("text", null, "b")
    ),
    React.createElement("text", null, "after")
  );
}

test("Fragment mixed with regular elements flattens correctly", () => {
  const result = compile(TestComponent2, {}, { target: "Widget" });
  const root = result.node;
  assert.equal(root.children.length, 4);
  assert.equal(root.children[0].text, "before");
  assert.equal(root.children[1].text, "a");
  assert.equal(root.children[2].text, "b");
  assert.equal(root.children[3].text, "after");
});

function TestComponent3() {
  return React.createElement(
    "widget",
    { id: "root" },
    React.createElement(
      React.Fragment,
      null,
      React.createElement(React.Fragment, null, React.createElement("text", null, "deep")),
      React.createElement("text", null, "shallow")
    )
  );
}

test("Nested fragments are fully flattened", () => {
  const result = compile(TestComponent3, {}, { target: "Widget" });
  const root = result.node;
  assert.equal(root.children.length, 2);
  assert.equal(root.children[0].text, "deep");
  assert.equal(root.children[1].text, "shallow");
});
