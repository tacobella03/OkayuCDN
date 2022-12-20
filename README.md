![Boot Test](https://github.com/okawaffles/OkayuCDNv3/actions/workflows/node.js.yml/badge.svg)
![Commits](https://img.shields.io/github/commit-activity/m/okawaffles/okayucdn/dev?style=flat-square)
![Commits since last release](https://img.shields.io/github/commits-difference/okawaffles/okayucdn?base=main&head=dev&label=commits%20since%20last%20release&style=flat-square)

# A File Upload Server
You create an account. You log in. You upload a file. You send the link. It embeds.
It's *that* easy.

## Why?
I felt like it. I wanted to make something useful. Now my friends can upload files greater than 8MB on discord.

## Should I use it?
Sure, go ahead. It's not intended to be used as a major server and it is quite unoptimized. Just don't pass it off as your own, please.

## How do I set it up?
*Note that the domain is hard-coded, so you will need to manually change it inside of the .ejs files.*
1. `git clone https://github.com/okawaffles/okayucdnv3.git`
2. `npm ci`
3. `node .`
4. Optionally, use nginx, etc. to make a reverse proxy.

### To-do
- change my box to use buttons instead of typing

### Notes
- Please do not use OkayuCDN in a commercial environment. It is not intended to be used in commercial environments and I *do not* own the rights to Nekomata Okayu. You are putting yourself at risk if you use this in a commercial environment.
- READ THE LICENSE, PLEASE
