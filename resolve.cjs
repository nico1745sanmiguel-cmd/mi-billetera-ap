const fs = require('fs');
const sourceMap = require('source-map');

const rawSourceMap = fs.readFileSync('dist/assets/index-DejontaW.js.map', 'utf8');

sourceMap.SourceMapConsumer.with(rawSourceMap, null, consumer => {
  const pos = consumer.originalPositionFor({
    line: 63,
    column: 14684
  });

  console.log(pos);
});
