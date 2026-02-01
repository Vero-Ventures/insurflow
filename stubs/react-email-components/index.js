/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Stub for @react-email/components - exports no-op components
const noop = () => null;
const passthrough = (props) => props?.children || null;

export const Body = passthrough;
export const Button = passthrough;
export const Container = passthrough;
export const Head = passthrough;
export const Heading = passthrough;
export const Hr = noop;
export const Html = passthrough;
export const Img = noop;
export const Link = passthrough;
export const Preview = passthrough;
export const Section = passthrough;
export const Tailwind = passthrough;
export const Text = passthrough;
export const Column = passthrough;
export const Row = passthrough;
export const Font = noop;
export const CodeBlock = noop;
export const CodeInline = passthrough;
export const Markdown = passthrough;

const components = {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  Column,
  Row,
  Font,
  CodeBlock,
  CodeInline,
  Markdown,
};

export default components;
