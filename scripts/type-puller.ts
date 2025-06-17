(async () => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Step 1: Locate the specific section
  const container = Array.from(document.querySelectorAll("div.flex.space-x-3")).find(el => {
    const typeHeading = el.querySelector("h2")?.textContent?.toLowerCase().includes("type");
    const baseHeading = el.querySelectorAll("h2")?.[1]?.textContent?.toLowerCase().includes("base");
    return typeHeading && baseHeading;
  });

  if (!container) {
    console.error("❌ Could not locate the type/base container.");
    return;
  }

  const selects = container.querySelectorAll("select");
  const typeSelect = selects[0];
  const baseSelect = selects[1];

  const typeOptions = Array.from(typeSelect.options).slice(1); // skip "Any"
  const output = [];

  for (const typeOption of typeOptions) {
    const typeValue = typeOption.value;
    const typeLabel = typeOption.textContent.trim();

    // Select the type
    typeSelect.value = typeValue;
    typeSelect.dispatchEvent(new Event("change", { bubbles: true }));

    await delay(400); // wait for base options to update

    const baseOptions = Array.from(baseSelect.options)
      .filter(opt =>
        opt.value &&
        opt.value !== "" &&
        opt.textContent.trim().toLowerCase() !== "select a type..."
      );

    const bases = baseOptions.map(opt => ({
      label: opt.textContent.trim(),
      value: opt.value,
    }));

    output.push({ typeLabel, typeValue, bases });
    console.log(`✔ ${typeLabel}`, bases.map(b => b.label));
  }

  console.log("✅ Done:");
  console.log(output);

  // Uncomment to copy JSON to clipboard
  // await navigator.clipboard.writeText(JSON.stringify(output, null, 2));
})();
