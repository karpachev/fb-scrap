YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "FacebookApi",
        "FacebookApiFactory",
        "PageScraper",
        "PageScraperFactory"
    ],
    "modules": [
        "Facebook API",
        "Page Scraper"
    ],
    "allModules": [
        {
            "displayName": "Facebook API",
            "name": "Facebook API",
            "description": "Module to work with the Facebook Graph API."
        },
        {
            "displayName": "Page Scraper",
            "name": "Page Scraper",
            "description": "Module to scrape a page and index it in the DB. The module exports\na factory function which accepts optional `options` \nargument:\n- `access_token` - the access token to use to scrape the FB page \n- `page_id` - the id of a Facebook page. Default: `me`. \n- `api_version` - the FB api version to use. Default: `v2.7`\n- `concurrency.api_calls` - number of concurrent requests to Facebook. Default: `20`"
        }
    ],
    "elements": []
} };
});