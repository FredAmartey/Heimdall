import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"

import { ThemeProvider } from "./theme"

describe("FooterCta", () => {
  it("links to architecture and docs", async () => {
    const { FooterCta } = await import("./footer")

    render(
      <ThemeProvider>
        <FooterCta />
      </ThemeProvider>,
    )

    expect(screen.getByRole("link", { name: "Architecture" }).getAttribute("href")).toBe("/architecture")
    expect(screen.getByRole("link", { name: "Docs" }).getAttribute("href")).toContain("/docs/architecture.md")
  })
})
