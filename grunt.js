module.exports = function(grunt) {

    var shell = require('shelljs');
    var vm = require('vm');

    // Project configuration.
    grunt.initConfig({
        pkg: '<json:package.json>',
        meta: {
            banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
            '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
            '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
            ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */'
        },
        qunit: {
            index: ['tests/qunit/tests/unit/*.html']
        },
        lint: {
            files: [
                'grunt.js',
                'admin/**/*.js',
                'shared/**/*.js',
                'ui/**/*.js',
                'node_modules/oae-*/**/*.js'
            ]
        },
        watch: {
            files: '<config:lint.files>',
            tasks: 'lint test'
        },
        jshint: {
            options: {
                sub: true
            },
            globals: {
                exports: true,
                module: false
            }
        },
        clean: {
            folder: 'target/'
        },
        requirejs: {
            optimize: {
                options: {
                    appDir: './',
                    baseUrl: './shared',
                    mainConfigFile: './shared/oae/api/oae.bootstrap.js',
                    dir: 'target/optimized',
                    optimize: 'uglify',
                    preserveLicenseComments: false,
                    optimizeCss: 'standard',
                    cssImportIgnore: null,
                    inlineText: true,
                    useStrict: false,
                    pragmas: {},
                    skipPragmas: false,
                    skipModuleInsertion: false,
                    modules: [{
                        name: 'oae.api'
                    }],
                    fileExclusionRegExp: /^(\.|tools|target|tests|grunt|shelljs)/,
                    logLevel: 2
                }
            }
        },
        ver: {
            oae: {
                phases: [
                // Hash these files
                    {
                        files: [
                            // Warning these files will be renamed
                            'target/optimized/shared/**/*.js',
                            'target/optimized/shared/**/*.css',
                            'target/optimized/ui/**/*.js',
                            'target/optimized/ui/**/*.css',
                            'target/optimized/ui/**/*.properties',
                            'target/optimized/admin/**/*.js',
                            'target/optimized/admin/**/*.css',
                            'target/optimized/admin/**/*.properties',
                            'target/optimized/node_modules/oae-*/**/*.js',
                            'target/optimized/node_modules/oae-*/**/*.html',
                            'target/optimized/node_modules/oae-*/**/*.css',
                            'target/optimized/node_modules/oae-*/**/*.properties'
                        ],
                        // Look for references to the above files in these files
                        references: [
                           'target/optimized/shared/**/*.js',
                           'target/optimized/shared/**/*.css',
                           'target/optimized/ui/**/*.html',
                           'target/optimized/ui/**/*.js',
                           'target/optimized/ui/**/*.css',
                           'target/optimized/admin/**/*.html',
                           'target/optimized/admin/**/*.js',
                           'target/optimized/admin/**/*.css',
                           'target/optimized/node_modules/oae-*/**/*.html',
                           'target/optimized/node_modules/oae-*/**/*.js',
                           'target/optimized/node_modules/oae-*/**/*.css',
                           'target/optimized/node_modules/oae-*/**/*.json'
                        ]
                    }
                ],
                version: 'target/hashes.json'
            }
        },
        inlineImg: {
            src: [
                'target/optimized/admin/**/*.css',
                'target/optimized/ui/**/*.css',
                'target/optimized/shared/**/*.css',
                'target/optimized/node_modules/oae-*/**/*.css'
                 ],
            ie8: false,
            base: __dirname
        }
    });

    // Load tasks from npm modules
    grunt.loadNpmTasks('grunt-clean');
    grunt.loadNpmTasks('grunt-git-describe');
    grunt.loadNpmTasks('grunt-ver');
    grunt.loadNpmTasks('grunt-imagine');
    grunt.loadNpmTasks('grunt-contrib-requirejs');

    // Task to write the version to a file
    grunt.registerTask('writeVersion', function() {
        this.requires('describe');
        var json = grunt.template.process('{"sakai:ux-version":"<%= meta.version %>"}');
        grunt.file.write('target/optimized/ui/version.json', json);
    });

    // Task to fill out the nginx config template
    grunt.registerTask('configNginx', function() {
        if (shell.test('-f', './nginx.json')) {
            var nginxConf = require('./nginx.json');
            var template = grunt.file.read('./nginx.conf');
            grunt.config.set('nginxConf', nginxConf);
            var conf = grunt.template.process(template);
            grunt.file.write('./target/optimized/nginx.conf', conf);
            grunt.log.writeln('nginx.conf rendered at ./target/optimized/nginx.conf'.green);
        } else {
            grunt.log.writeln('No nginx.json found, not rendering nginx.conf template'.yellow);
        }
    });

    // Task to hash files
    grunt.registerTask('hashFiles', function() {
        this.requires('requirejs');
        this.requires('inlineImg');
        grunt.task.run('ver');
        grunt.task.run('updateBootstrapPaths');
    });

    // Task to update the paths in oae.bootstrap to the hashed versions
    grunt. registerTask('updateBootstrapPaths', function() {
        this.requires('ver');
        var hashedPaths = require('./target/hashes.json');
        var bootstrapPath = hashedPaths['target/optimized/shared/oae/api/oae.bootstrap.js'];
        var bootstrap = grunt.file.read(bootstrapPath);
        var regex = /paths:\{[^}]*\}/;
        var paths = vm.runInThisContext('paths = {' + bootstrap.match(regex) + '}').paths;
        Object.keys(paths).forEach(function(key) {
            var prefix = 'target/optimized/shared/';
            var path = prefix + paths[key] + '.js';
            var hashedPath = '';
            if (hashedPaths[path]) {
                hashedPath = hashedPaths[path];
                // trim off prefix and .js
                paths[key] = hashedPath.substring(prefix.length, hashedPath.length - 3);
            }
        });
        bootstrap = bootstrap.replace(regex, 'paths:' + JSON.stringify(paths));
        grunt.file.write(bootstrapPath, bootstrap);
        grunt.log.writeln('Boots strapped'.green);
    });

    // Override the test task with the qunit task
    grunt.registerTask('test', 'qunit');
    // Default task.
    grunt.registerTask('default', 'clean describe requirejs inlineImg hashFiles writeVersion configNginx');
};
