module.exports = {
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: ['node_modules', 'public', '\\.next', 'out'],
    },
    tsPreCompilationDeps: false,
    combinedDependencies: true,
    preserveSymlinks: false,
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
      archi: {
        collapsePattern: 'node_modules/[^/]+',
      },
    },
  },
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Prevent circular dependencies',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-frontend-depends-on-api',
      comment:
        'No frontend code in app/ (except app/api) should depend on app/api',
      severity: 'error',
      from: {
        path: '^app/(?!api/)',
      },
      to: {
        path: '^app/api/',
      },
    },
  ],
};
