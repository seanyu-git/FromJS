import * as OperationTypes from "./OperationTypes";
import { instrumentAndRun } from "./testHelpers";

test("adds 1 + 2 to equal 3", done => {
  instrumentAndRun("return 1 + 2").then(({ normal, tracking }) => {
    expect(normal).toBe(3);
    expect(tracking.type).toBe(OperationTypes.binaryExpression);
    expect(tracking.argTrackingValues[1].type).toBe(
      OperationTypes.numericLiteral
    );

    done();
  });
});

test("Can handle variable declarations with init value", done => {
  instrumentAndRun(`
    var a = "Hello", b = 2
    return b
  `).then(({ normal, tracking }) => {
    expect(normal).toBe(2);
    expect(tracking.argTrackingValues[0].type).toBe("numericLiteral");

    done();
  });
});

test("Can handle object literals", done => {
  instrumentAndRun(`
    var stringKey = {"a": "a"}
    var numberKey = {1: "a"}
    return {a: "a"}
  `).then(({ normal, tracking }) => {
    expect(normal.a).toBe("a");
    done();
  });
});

test("Can handle try catch statements", done => {
  instrumentAndRun(`
    try {} catch (err) {}
    return null
  `).then(({ normal, tracking }) => {
    done();
  });
});

test("Can handle for in statements", done => {
  instrumentAndRun(`
    var obj = {}
    for (var key in obj) {}
    for (key in obj) {}
    return null
  `).then(({ normal, tracking }) => {
    done();
  });
});

test("Can handle function expressions", done => {
  instrumentAndRun(`
    var fn = function sth(){}
    return null
  `).then(({ normal, tracking }) => {
    done();
  });
});

test("Can handle typeof on non existent variables", done => {
  instrumentAndRun(`
    return typeof a
  `).then(({ normal, tracking }) => {
    done();
  });
});

describe("Can handle variables that aren't declared explicitly", () => {
  test("global variables", done => {
    instrumentAndRun(`
      global.__abcdef = "a"
      __abcdef = "b"
    `).then(({ normal, tracking }) => {
      done();
    });
  });
  test("global variables in function calls", done => {
    instrumentAndRun(`
      var fnGlobal = function(){}
      fnGlobal(global)
    `).then(({ normal, tracking }) => {
      done();
    });
  });
  test("arguments object", done => {
    instrumentAndRun(`
      var fn = function(a){ return a * 2 }
      var fn2 = function() { return fn(arguments[0]) }
      return fn2(2)
    `).then(({ normal, tracking }) => {
      expect(normal).toBe(4);
      done();
    });
  });
});

test("Can handle ++ unary expresion", done => {
  instrumentAndRun(`
    var a = 0
    a++
    return a
  `).then(({ normal, tracking }) => {
    expect(normal).toBe(1);
    done();
  });
});

describe("Can handle while loops correctly", () => {
  test("simple", done => {
    instrumentAndRun(`
      var list = [1]
      var item
      var counter =0
      while (item = list.pop()) {
        counter++
        if (counter > 1) {
          throw Error("no")
        }
      }
      return counter
    `).then(({ normal, tracking, code }) => {
      expect(normal).toBe(1);
      done();
    });
  });
  test("complex", done => {
    instrumentAndRun(`
      var list = [1, null]
      var item
      var counter = 0
      while ((item = list.shift()) !== null) {
        counter++
        if (counter > 1) {
          throw Error("no")
        }
      }

      return counter
    `).then(({ normal, tracking }) => {
      expect(normal).toBe(1);
      done();
    });
  });
});

test("Can handle assignments in if statements", done => {
  instrumentAndRun(`
    var a
    if (a=0) {
      return "not ok"
    }
    return "ok"
  `).then(({ normal, tracking }) => {
    expect(normal).toBe("ok");
    done();
  });
});

test("Can handle for loops that contain assignments in the condition", done => {
  instrumentAndRun(`
    var elems = [{n: 1}, {n: 2}]
    var elem
    var i = 0
    for ( ; (elem = elems[ i ]) !== undefined; i++ ) {
      if (!elem || typeof elem.n !== "number") {
        throw Error("fail")
      }
    }
  `).then(({ normal, tracking }) => {
    // expect(normal).toBe("ok");
    done();
  });
});

test("Does not call getters twice when making calls", done => {
  instrumentAndRun(`
    var obj = {}
    var getterInvocationCount = 0
    Object.defineProperty(obj, "sth", {
      get: function(){
        getterInvocationCount++
        return {
          fn: function(){
            return 99
          }
        }
      }
    })

    var val = obj.sth.fn()
    if (getterInvocationCount > 1) {
      throw Error("getter called too often")
    }
  `).then(({ normal, tracking }) => {
    done();
  });
});

test("Returns the assigned value from assignments", done => {
  instrumentAndRun(`
    var b
    var a = (b = 5)
    return a
  `).then(({ normal, tracking }) => {
    expect(normal).toBe(5);
    done();
  });
});

test("Tracks object literal values", done => {
  instrumentAndRun(`
    var obj = {
      a: 5,
      b: 6
    }
    return obj.a
  `).then(({ normal, tracking }) => {
    expect(normal).toBe(5);

    done();
  });
});

test("Tracks object property assignments", done => {
  instrumentAndRun(`
    var obj = {}
    obj.a = 5
    return obj.a
  `).then(({ normal, tracking }) => {
    expect(normal).toBe(5);
    done();
  });
});

test("Tracks object property assignments with computed properties", done => {
  instrumentAndRun(`
    var obj = {}
    obj["a"] = 5
    return obj.a
  `).then(({ normal, tracking }) => {
    expect(normal).toBe(5);

    done();
  });
});

test("Tracks where a function's context came from", done => {
  instrumentAndRun(`
    var a = "a"
    return a.slice(0)
  `).then(({ normal, tracking, code }) => {
    // function context is string "a"
    expect(tracking.argTrackingValues[1].argTrackingValues[0].type).toBe(
      "stringLiteral"
    );

    done();
  });
});

describe("Tracks values across assignments", () => {
  it("Works when assigning a new value", done => {
    instrumentAndRun(`
    var a = "a"
    a = "b"
    return a
  `).then(({ normal, tracking, code }) => {
      expect(tracking.argTrackingValues[0].argValues[3]).toBe("b");

      done();
    });
  });
  it("Works when assigning a variable value", done => {
    instrumentAndRun(`
    var a = "a"
    var b = "b"
    a = b
    return a
  `).then(({ normal, tracking, code }) => {
      expect(normal).toBe("b");
      expect(tracking.argTrackingValues[0].argTrackingValues[4].resVal).toBe(
        "b"
      );

      done();
    });
  });
});

it("Can track `-` binary expressions", done => {
  instrumentAndRun(`
    var a = 10 - 8
    return a
  `).then(({ normal, tracking, code }) => {
    expect(normal).toBe(2);
    expect(tracking.argTrackingValues[0].type).toBe("binaryExpression");
    // expect(tracking.argTrackingValues[0].argValues[0]).toBe("b");

    done();
  });
});

it("Can track `/=` binary expressions", done => {
  instrumentAndRun(`
    var a = 10
    a /= 2
    return a
  `).then(({ normal, tracking, code }) => {
    expect(normal).toBe(5);
    var assignmentExpression = tracking.argTrackingValues[0];
    expect(assignmentExpression.type).toBe(OperationTypes.assignmentExpression);
    expect(assignmentExpression.argValues[0]).toBe("/=");
    expect(assignmentExpression.argTrackingValues[2].resVal).toBe(10);
    expect(assignmentExpression.argTrackingValues[4].argValues[0]).toBe(2);

    done();
  });
});

describe("AssignmentExpression", () => {
  it("Does not invoke memberExpression objects more than once", done => {
    instrumentAndRun(`
      var counter = 0
      var obj = {val:"a"}
      function a() {
        counter++;
        return obj
      }
      a().val += "b"
      return [counter, obj.val]    
    `).then(({ normal, tracking, code }) => {
      const memberExpression = tracking.argTrackingValues[1]; // obj.val

      expect(normal[0]).toBe(1);
      expect(normal[1]).toBe("ab");

      done();
    });
  });
});

it("Trakcs array expressions", done => {
  instrumentAndRun(`
    var a = [1,2,3]
    return a
  `).then(({ normal, tracking, code }) => {
    expect(normal).toEqual([1, 2, 3]);
    var arrayExpression = tracking.argTrackingValues[0];
    expect(arrayExpression.argTrackingValues[0].type).toBe("numericLiteral");

    done();
  });
});

// test return [a,b]