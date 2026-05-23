module.exports = function (eleventyConfig) {
  // Pass public assets through unchanged
  eleventyConfig.addPassthroughCopy({ "public": "/" });
  // Pass admin folder through unchanged
  eleventyConfig.addPassthroughCopy("src/admin");

  return {
    dir: {
      input: "src",
      output: "_site",
      data: "_data",
    },
    templateFormats: ["njk", "html"],
    htmlTemplateEngine: "njk",
  };
};
