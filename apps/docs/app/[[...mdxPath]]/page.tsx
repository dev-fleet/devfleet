import { generateStaticParamsFor, importPage } from "nextra/pages";
import { useMDXComponents as getMDXComponents } from "../../mdx-components";

export const generateStaticParams = generateStaticParamsFor("mdxPath");

type PageProps = {
  params: Promise<{ mdxPath?: string[] }>;
};

export async function generateMetadata(props: PageProps) {
  const { mdxPath } = await props.params;
  const { metadata } = await importPage(mdxPath);
  return {
    title: `${metadata.title} | DevFleet`,
    description: metadata.description || "DevFleet Documentation",
  };
}

const Wrapper = getMDXComponents().wrapper;

export default async function Page(
  props: PageProps
): Promise<React.ReactElement> {
  const params = await props.params;
  const result = await importPage(params.mdxPath);
  const { default: MDXContent, toc, metadata, sourceCode } = result;
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
