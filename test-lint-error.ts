// This file is intentionally created with lint errors to test pre-commit hooks
// Adding syntax errors that should definitely trigger ESLint

const test = "missing semicolon"

function badFunction() {
  const x = 1
  if (x == 1 {  // Missing closing parenthesis - syntax error
    console.log("syntax error");
  }
  return x
}

export { badFunction }