import assert from "node:assert/strict";

import { buildExtractionBodyText, buildMailBodyContent } from "../lib/gmail-message-body";

{
  const content = buildMailBodyContent({
    text: ["View this email in your browser: https://example.test/display"],
    html: [
      "<html><body><p>Name: Html Candidate</p><p>Role: TypeScript Engineer</p><p>Skills: TypeScript, React</p></body></html>",
    ],
  });

  assert.equal(content.bodyTextSource, "text/html");
  assert.equal(content.bodyText?.includes("Html Candidate"), true);
  assert.equal(content.normalizedBody?.includes("TypeScript Engineer"), true);
  assert.equal(content.bodyText?.includes("https://example.test/display"), false);
}

{
  const bodyText = buildExtractionBodyText({
    bodyText: "View online https://example.test/display",
    bodyHtml: "<div>Project: Billing API renewal</div><div>Stack: Java, Spring, AWS</div>",
    normalizedBody: "View online https://example.test/display",
    snippet: "Snippet should not win when HTML has the full body",
    subject: "Subject should not win when HTML has the full body",
  });

  assert.equal(bodyText?.includes("Billing API renewal"), true);
  assert.equal(bodyText?.includes("Snippet should not win"), false);
}

{
  const bodyText = buildExtractionBodyText({
    bodyText: "View this email in your browser: https://example.test/display/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    bodyHtml: "<div>Project: Long URL fallback</div><div>Stack: Python, AWS</div>",
    normalizedBody: "View this email in your browser: https://example.test/display/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    snippet: "Snippet should not win against meaningful HTML",
    subject: "Subject should not win against meaningful HTML",
  });

  assert.equal(bodyText?.includes("Long URL fallback"), true);
  assert.equal(bodyText?.includes("aaaaaaaaaaaaaaaa"), false);
}

{
  const bodyText = buildExtractionBodyText({
    bodyText: "https://example.test/display/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    normalizedBody: "https://example.test/display/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    snippet: "Snippet fallback after long display URL",
    subject: "Subject fallback after long display URL",
  });

  assert.equal(bodyText, "Snippet fallback after long display URL");
}

{
  const bodyText = buildExtractionBodyText({
    bodyText: "陦ｨ遉ｺ縺輔ｌ縺ｪ縺л陦ｨ遉ｺ縺ｧ縺阪↑縺л縺薙■繧榎繝悶Λ繧ｦ繧ｶ https://example.test/display",
    normalizedBody: "陦ｨ遉ｺ縺輔ｌ縺ｪ縺л陦ｨ遉ｺ縺ｧ縺阪↑縺л縺薙■繧榎繝悶Λ繧ｦ繧ｶ https://example.test/display",
    snippet: "Snippet fallback after display-link mojibake",
    subject: "Subject fallback after display-link mojibake",
  });

  assert.equal(bodyText, "Snippet fallback after display-link mojibake");
}

{
  const bodyText = buildExtractionBodyText({
    bodyText: "表示されない場合はこちら ブラウザで表示 https://example.test/display",
    normalizedBody: "表示されない場合はこちら ブラウザで表示 https://example.test/display",
    snippet: "Snippet fallback after Japanese display link",
    subject: "Subject fallback after Japanese display link",
  });

  assert.equal(bodyText, "Snippet fallback after Japanese display link");
}

{
  const bodyText = buildExtractionBodyText({
    bodyText: " . \n---",
    normalizedBody: " . \n---",
    snippet: "Snippet fallback body with React and Node.js",
    subject: "Subject fallback body",
  });

  assert.equal(bodyText, "Snippet fallback body with React and Node.js");
}

{
  const bodyText = buildExtractionBodyText({
    bodyText: "\n...\n",
    normalizedBody: null,
    snippet: " - ",
    subject: "Subject fallback body with Java",
  });

  assert.equal(bodyText, "Subject fallback body with Java");
}

{
  const bodyText = buildExtractionBodyText({
    bodyText: "Java project",
    normalizedBody: "Java project",
    snippet: "Different snippet",
    subject: "Different subject",
  });

  assert.equal(bodyText, "Java project");
}

console.log("gmail message body fallback tests passed");
