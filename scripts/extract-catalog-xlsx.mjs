import fs from "node:fs/promises";
import { inflateRawSync } from "node:zlib";

const source = process.argv[2] ?? "decantscba_catalogo.xlsx";
const output = process.argv[3] ?? "catalog-extracted.json";

function readU16(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

function readU32(buffer, offset) {
  return (
    (buffer[offset] |
      (buffer[offset + 1] << 8) |
      (buffer[offset + 2] << 16) |
      (buffer[offset + 3] << 24)) >>>
    0
  );
}

function unzip(buffer) {
  const files = new Map();
  const eocdOffset = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));

  if (eocdOffset !== -1) {
    const entryCount = readU16(buffer, eocdOffset + 10);
    let centralOffset = readU32(buffer, eocdOffset + 16);

    for (let index = 0; index < entryCount; index += 1) {
      if (readU32(buffer, centralOffset) !== 0x02014b50) break;

      const method = readU16(buffer, centralOffset + 10);
      const compressedSize = readU32(buffer, centralOffset + 20);
      const nameLength = readU16(buffer, centralOffset + 28);
      const extraLength = readU16(buffer, centralOffset + 30);
      const commentLength = readU16(buffer, centralOffset + 32);
      const localOffset = readU32(buffer, centralOffset + 42);
      const name = buffer
        .subarray(centralOffset + 46, centralOffset + 46 + nameLength)
        .toString("utf8");
      const localNameLength = readU16(buffer, localOffset + 26);
      const localExtraLength = readU16(buffer, localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(start, start + compressedSize);
      const bytes = method === 0 ? compressed : inflateRawSync(compressed);

      files.set(name, bytes.toString("utf8"));
      centralOffset += 46 + nameLength + extraLength + commentLength;
    }

    return files;
  }

  return files;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function columnIndex(cellRef) {
  const letters = cellRef.match(/[A-Z]+/)?.[0] ?? "A";
  return (
    [...letters].reduce(
      (total, char) => total * 26 + char.charCodeAt(0) - 64,
      0,
    ) - 1
  );
}

function sharedStrings(files) {
  const xml = files.get("xl/sharedStrings.xml");
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => {
    const text = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((part) => decodeXml(part[1]))
      .join("");
    return text.trim();
  });
}

function sheetNames(files) {
  const workbook = files.get("xl/workbook.xml") ?? "";
  const rels = files.get("xl/_rels/workbook.xml.rels") ?? "";
  const relMap = new Map(
    [...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((match) => {
      const attrs = match[1];
      const id = attrs.match(/\bId="([^"]+)"/)?.[1] ?? "";
      const target = attrs.match(/\bTarget="([^"]+)"/)?.[1] ?? "";
      return [id, target];
    }),
  );

  return [...workbook.matchAll(/<[^<\s:]*:?sheet\b([^>]*)\/?>/g)].map(
    (match) => {
      const attrs = match[1];
      const name = attrs.match(/\bname="([^"]+)"/)?.[1] ?? "Sheet";
      const relId = attrs.match(/\br:id="([^"]+)"/)?.[1] ?? "";
      const target = relMap.get(relId) ?? "";
      return {
        name: decodeXml(name),
        path: target.startsWith("/")
          ? target.replace(/^\//, "")
          : `xl/${target}`,
      };
    },
  );
}

function cellValue(cellXml, type, shared) {
  if (type === "inlineStr") {
    return decodeXml(
      [...cellXml.matchAll(/<[^<\s:]*:?t[^>]*>([\s\S]*?)<\/[^<\s:]*:?t>/g)]
        .map((match) => match[1])
        .join(""),
    ).trim();
  }

  const value =
    cellXml.match(/<[^<\s:]*:?v>([\s\S]*?)<\/[^<\s:]*:?v>/)?.[1] ?? "";
  if (type === "s") return shared[Number(value)] ?? "";
  return decodeXml(value).trim();
}

function parseSheet(xml, shared) {
  const rows = [];
  const normalizedXml = xml.replace(/<([^<\s:]*:?c)([^>]*)\/>/g, "<$1$2></$1>");

  for (const rowMatch of normalizedXml.matchAll(
    /<[^<\s:]*:?row[^>]*>([\s\S]*?)<\/[^<\s:]*:?row>/g,
  )) {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(
      /<[^<\s:]*:?c([^>]*)>([\s\S]*?)<\/[^<\s:]*:?c>/g,
    )) {
      const attrs = cellMatch[1];
      const ref = attrs.match(/r="([^"]+)"/)?.[1] ?? "A1";
      const type = attrs.match(/t="([^"]+)"/)?.[1] ?? "";
      row[columnIndex(ref)] = cellValue(cellMatch[2], type, shared);
    }
    rows.push(row.map((value) => value ?? ""));
  }

  return rows;
}

const buffer = await fs.readFile(source);
const files = unzip(buffer);
const shared = sharedStrings(files);
const sheets = sheetNames(files).map((sheet) => ({
  name: sheet.name,
  rows: parseSheet(files.get(sheet.path) ?? "", shared),
}));

if (sheets.length === 0) {
  console.log([...files.keys()].slice(0, 30).join("\n"));
}

await fs.writeFile(output, JSON.stringify(sheets, null, 2));
console.log(`Extracted ${sheets.length} sheet(s) to ${output}`);
