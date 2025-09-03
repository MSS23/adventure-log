// This file is intentionally created with lint errors to test pre-commit hooks

const unused_variable = "this should trigger an ESLint error";

function badlyFormatted(){
  console.log( "bad formatting" )
  const another_unused="more issues"
}

export    {   badlyFormatted    }