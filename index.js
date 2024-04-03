import Parser from 'rss-parser';
import fetch from 'node-fetch';
import { JSDOM } from "jsdom";
import express from "express";

const app = express();

app.get("/", (request, response) => {
    response.send("I'm watching you, VWOT wiki.");
});

app.listen(3000, () => {
    console.log("Listen on the port 3000...");
});

let parser = new Parser();

let firstItem = null
setInterval(async () => {
  try {
    let feed = await parser.parseURL('https://mijoviewerswar.miraheze.org/wiki/Special:RecentChanges?feed=rss');
    if (feed.items.length === 0) return;
    if (firstItem !== null && firstItem !== feed.items[0].link) {
      const item = feed.items[0]
      const result = []
      const dom = new JSDOM(item.content)

      const elems = Array.from(dom.window.document.getElementsByTagName("table")[0].querySelectorAll("tr")).slice(1)
      for (let element of elems) {
        if (element.querySelector(".diff-multi")) continue
        if (element.querySelector(".diff-lineno")) continue
        let marker = null
        for (let child of element.children) {
          if (child.classList.contains("diff-marker")) {
           marker = child.innerHTML === "&nbsp;" ? "" : child.innerHTML
         } else {
            if (child.children.length === 0) continue
            let curr = null
            switch (marker) {
              case "−":
                curr = "\u001b[0;31m - "
                break
              case "+":
                curr = "\u001b[0;32m + "
                break
              case "":
                curr = "\u001b[0;37m"
            }
            //const iterator = dom.window.document.createNodeIterator(child.querySelector("div"))
            /*let currNode = null;
            while (currNode = iterator.nextNode()) {*/
            for (let currNode of child.querySelector("div").childNodes) {
              if (currNode.nodeType === dom.window.Node.TEXT_NODE) {
                curr += currNode.nodeValue
              }
              if (currNode.nodeType === dom.window.Node.ELEMENT_NODE) {
                if (currNode.tagName === "INS" || currNode.tagName === "DEL") {
                  curr += "\u001b[1m" + currNode.innerHTML + "\u001b[0m"
                } else {
                  curr += currNode.outerHTML
                }
              }
            }
            result.push(curr)
            if (marker === "") break
          }
        }
      }


      const res = await fetch(process.env["wh_url"], {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          embeds: [{
            title: item.title,
            description: "```ansi\n" + result.join("\n").substring(0, 4000) + "```",
            url: item.link,
            timestamp: item.isoDate
          }],
          components: [
            {
              "type": 1,
              "components": [
                {
                  "type": 2,
                  "label": "Changes",
                  "style": 5,
                  "url": item.link
                },
                {
                  "type": 2,
                  "label": "Visit",
                  "style": 5,
                  "url": item.link.split("?")[0]
                },
                {
                  "type": 2,
                  "label": "Edit",
                  "style": 5,
                  "url": item.link.split("?")[0] + "?action=edit"
                },
                {
                  "type": 2,
                  "label": "History",
                  "style": 5,
                  "url": item.link.split("?")[0] + "?action=history"
                }
              ]
            }
          ]
        })
      })
      console.log(await res.text())
      //console.log(feed.items[0])
    }
    firstItem = feed.items[0].link
  } catch (e) {
    console.error(e.stack)
  }
}, 1000)