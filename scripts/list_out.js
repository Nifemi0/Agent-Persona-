const fs = require('fs');
const path = require('path');
const files = require('child_process').execSync('find out -type f -name "*.json"').toString().trim().split('\n');
console.log(files.slice(0,20));
