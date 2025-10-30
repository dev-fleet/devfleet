import { generateStaticParamsFor, importPage } from "nextra/pages";
import { useMDXComponents as getMDXComponents } from "../../mdx-components";

export const generateStaticParams = generateStaticParamsFor("mdxPath");

export async function generateMetadata(props: any) {
  const { mdxPath } = await props.params;
  const { metadata } = await importPage(mdxPath);
  return {
    title: `${metadata.title} | DevFleet`,
    description: metadata.description || "DevFleet Documentation",
  };
}

const Wrapper = getMDXComponents().wrapper;

// @ts-expect-error - TODO: fix this
export default async function Page(props) {
  const params = await props.params;
  const result = await importPage(params.mdxPath);
  const { default: MDXContent, toc, metadata, sourceCode } = result;
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
