// This file is intentionally created with lint errors to test pre-commit hooks
// Adding more lint errors to test the pre-commit hook

const unused_variable = "this should trigger an ESLint error";
const another_unused_var = "more unused variables";

function badlyFormatted(){
  console.log( "bad formatting" );
  const another_unused="more issues";
  console.log("missing semicolon")
}

export    {   badlyFormatted    };