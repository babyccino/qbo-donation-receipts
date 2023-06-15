import { ReactNode } from "react"

import { Accordion } from "flowbite-react"
const { Panel, Title, Content } = Accordion

export const P = ({ children }: { children: ReactNode }) => (
  <p className="mb-4 font-light text-gray-500 dark:text-gray-400 sm:text-lg">{children}</p>
)
export const H1 = ({ children }: { children: ReactNode }) => (
  <h1 className="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
    {children}
  </h1>
)
export const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-4 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
    {children}
  </h2>
)
export const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="text-l mb-4 font-bold tracking-tight text-gray-900 dark:text-white">{children}</h3>
)
export const Ul = ({ children }: { children: ReactNode }) => (
  <ul className="mb-6 list-inside list-disc space-y-1 text-gray-500 dark:text-gray-400">
    {children}
  </ul>
)
export const Ol = ({ children }: { children: ReactNode }) => (
  <ol className="mb-6 list-inside list-decimal space-y-1 text-gray-500 dark:text-gray-400">
    {children}
  </ol>
)
export const Q = ({ children }: { children: ReactNode }) => <>&quot;{children}&quot;</>

const Definitions = () => (
  <>
    <P>For the purposes of this Privacy Policy:</P>
    <Ul>
      <li>
        <strong>Account</strong> means a unique account created for You to access our Service or
        parts of our Service.
      </li>
      <li>
        <strong>Affiliate</strong> means an entity that controls, is controlled by or is under
        common control with a party, where <Q>control</Q> means ownership of 50% or more of the
        shares, equity interest or other securities entitled to vote for election of directors or
        other managing authority.
      </li>
      <li>
        <strong>Company</strong> (referred to as either <Q>the Company</Q>, <Q>We</Q>,<Q>Us</Q> or{" "}
        <Q>Our</Q> in this Agreement) refers to {companyName}.
      </li>
      <li>
        <strong>Cookies</strong> are small files that are placed on Your computer, mobile device or
        any other device by a website, containing the details of Your browsing history on that
        website among its many uses.
      </li>
      <li>
        <strong>Country</strong> refers to: British Columbia, Canada
      </li>
      <li>
        <strong>Device</strong> means any device that can access the Service such as a computer, a
        cellphone or a digital tablet.
      </li>
      <li>
        <strong>Personal Data</strong> is any information that relates to an identified or
        identifiable individual.
      </li>
      <li>
        <strong>Service</strong> refers to the Website.
      </li>
      <li>
        <strong>Service Provider</strong> means any natural or legal person who processes the data
        on behalf of the Company. It refers to third-party companies or individuals employed by the
        Company to facilitate the Service, to provide the Service on behalf of the Company, to
        perform services related to the Service or to assist the Company in analyzing how the
        Service is used.
      </li>
      <li>
        <strong>Usage Data</strong> refers to data collected automatically, either generated by the
        use of the Service or from the Service infrastructure itself (for example, the duration of a
        page visit).
      </li>
      <li>
        <strong>Website</strong> refers to {companyName}, accessible from{" "}
        <a
          href={url}
          rel="external nofollow noopener"
          target="_blank"
          className="font-medium underline"
        >
          {url}
        </a>
      </li>
      <li>
        <strong>You</strong> means the individual accessing or using the Service, or the company, or
        other legal entity on behalf of which such individual is accessing or using the Service, as
        applicable.
      </li>
      <li>
        <strong>Privacy Policy</strong>(referred to as either <Q>the Privacy Policy</Q>, or
        <Q>Polciy</Q> in this Agreement) describes Our policies and procedures on the collection,
        use and disclosure of Your information when You use the Service and tells You about Your
        privacy rights and how the law protects You. You can find the Privacy Policy here{" "}
        <a className="font-medium underline" href={url + "/privacy"}>
          {url + "/privacy"}
        </a>
      </li>
      <li>
        <strong>Terms and Conditions</strong>(referred to as either <Q>the Terms and Confitions</Q>,
        or <Q>the Terms</Q> in this Agreement) describes Our policies and procedures on the
        collection, use and disclosure of Your information when You use the Service and tells You
        about Your privacy rights and how the law protects You. You can find the Privacy Policy here{" "}
        <a href={url + "/privacy"}>{url + "/privacy"}</a>
      </li>
    </Ul>
  </>
)
export const InterpretationDefinitions = (
  <Panel>
    <Title>Interpretation and Definitions</Title>
    <Content>
      <H2>Interpretation</H2>
      <P>
        The words of which the initial letter is capitalized have meanings defined under the
        following conditions. The following definitions shall have the same meaning regardless of
        whether they appear in singular or in plural.
      </P>
      <H2>Definitions</H2>
      <Definitions />
    </Content>
  </Panel>
)
export const email = "gus.ryan163@gmail.com"
export const companyName = "DonationReceipt.online"
export const url = "https://www.donationreceipt.online"
