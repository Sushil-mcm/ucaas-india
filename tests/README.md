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

    npx esbuild src/lib/removal-impact.ts --format=cjs --outfile=tests/removal.build.cjs
    node tests/removal-test.cjs
    npx esbuild src/lib/contact-blocking.ts --format=cjs --outfile=tests/contact-blocking.build.cjs
    node tests/contact-blocking-test.cjs

    npx esbuild src/lib/contact-labels.ts --format=cjs --outfile=tests/contact-labels.build.cjs
    node tests/contact-labels-test.cjs

    npx esbuild src/lib/contact-sync.ts --format=cjs --outfile=tests/contact-sync.build.cjs \
      --bundle --platform=node
    node tests/contact-sync-test.cjs
Opening hours and holidays for a location — whether a holiday beats the weekly
hours, whether a location's own holiday beats a company one, and what "open"
means on a clock that is not yours.

    npx esbuild src/lib/location-hours.ts --format=cjs --outfile=tests/location-hours.build.cjs
    node tests/location-hours-test.cjs

Changing one setting for many people at once — that only the settings an admin
ticked are written, that everything else on a person's record survives the
write, and that somebody already set that way is left alone rather than saved
again.

    npx esbuild src/lib/bulk-user-settings.ts --format=cjs --outfile=tests/bulk-user-settings.build.cjs
    node tests/bulk-user-settings-test.cjs
