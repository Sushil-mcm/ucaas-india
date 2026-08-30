# Tests

Plain Node scripts, no framework. Each one proves a piece of logic that can be
checked without a backend or a browser.

    node tests/number-cache-test.cjs
    node tests/ivr-version-test.cjs
    npx esbuild src/lib/ivr-menu-checks.ts --format=cjs --outfile=tests/ivr-checks.build.cjs
    node tests/ivr-checks-test.cjs

The point of these is that the logic lives in `src/lib/` as a module rather than
inside a component, so it can be proven now and reused by whoever builds the
backend later.

    npx esbuild src/lib/acd-routing.ts --format=cjs --outfile=tests/acd.build.cjs
    node tests/acd-test.cjs

    npx esbuild src/lib/cost-centres.ts --format=cjs --outfile=tests/cost-centres.build.cjs
    node tests/cost-centres-test.cjs

    npx esbuild src/lib/admin-scope.ts --format=cjs --outfile=tests/admin-scope.build.cjs
    node tests/admin-scope-test.cjs

    npx esbuild src/lib/spend-breakdown.ts --format=cjs --outfile=tests/spend.build.cjs \
      --bundle --external:libphonenumber-js --platform=node
    node tests/spend-test.cjs
