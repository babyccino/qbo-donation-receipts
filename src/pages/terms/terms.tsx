import { and, eq, isNotNull } from "drizzle-orm"
import { Accordion } from "flowbite-react"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"

import {
  H1,
  H3,
  InterpretationDefinitions,
  Ol,
  P,
  Q,
  companyName,
  url,
} from "@/components/agreements"
import { LayoutProps } from "@/components/layout"
import { db } from "@/lib/db"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { accounts, sessions } from "db/schema"

const { Panel, Title, Content } = Accordion

const Terms = () => (
  <section className="m-8 max-w-4xl">
    <H1>Terms and Conditions</H1>
    <P>Last updated: June 7th, 2023</P>
    <P>
      These are the Terms and Conditions of Service for the Website. These Terms shall supplement
      our Privacy Policy.
    </P>
    <P>The Site and appertaining products and services are provided by {companyName} Inc.</P>
    <Accordion flush collapseAll>
      {InterpretationDefinitions}
      <Panel>
        <Title>Acceptance</Title>
        <Content>
          <P>
            Please read and acknowledge the following terms and conditions (<Q>Terms</Q>) that
            govern your use of {companyName} and its associated services. By continuing to browse
            and use {companyName}, you agree to be bound by these Terms, which, together with our
            Policy, establish the relationship between you and {companyName} regarding the Site and
            the products and services offered.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Updates</Title>
        <Content>
          <P>
            {companyName} reserves the right to modify, amend, suspend, terminate, upgrade, update,
            or otherwise alter these Terms, the Site, the Products, and the Services at any time
            without prior notice. Any changes will be displayed on the Site, and we may notify you
            via email. Please refer to the most recent effective date of any updates. Your use of
            our Services after the effective date of any update, whether through account
            registration or general use, indicates your acceptance of the modified Terms.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Support Services</Title>
        <Content>
          <P>
            If you have any questions or concerns about the Site, Products, or Services, please
            contact us using the information provided on our contact web page. We offer live chat
            services where you can interact with our customer agents to address your queries.
            Alternatively, you can reach us via email. We will make commercially reasonable efforts
            to respond promptly. Please ensure you provide detailed information regarding your
            service query for clear identification of your issue.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Payments</Title>
        <Content>
          <P>
            You are responsible for providing accurate and up-to-date billing information. Unless
            required by law, all purchases are final and non-cancelable or non-refundable. In the
            event of a chargeback or failed payment, you are obligated to promptly settle any
            outstanding amounts upon receiving notice from us. Failure or inability to process any
            payment does not release you from your payment obligations. By authorizing us to charge
            your credit card or payment processing account, you grant us ongoing authorization to
            submit periodic charges without further consent, which will remain effective until you
            cancel your subscription.
          </P>
          <P>
            We utilize Stripe, a globally recognized third-party payment processor, to handle
            billing through a payment account connected to your {companyName} account. The
            processing of payments is governed by the fees, terms, conditions, and privacy policies
            set forth by the payment processor. Please note that {companyName} is not accountable
            for any errors, fees, or currency conversion charges imposed by the payment processor.
            It is advisable to periodically review the terms and policies of the payment processor,
            as they regulate the services provided to you.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Account Registration and Security</Title>
        <Content>
          <P>
            To access our Products or Services, you will need to create an account by completing all
            the required fields on the registration form. It is essential to provide accurate and
            complete information. You are solely responsible for any activity that occurs in your
            account, including any misuse or unauthorized access by third parties.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Account Suspension, Termination</Title>
        <Content>
          <P>
            We encourage you to report any violations of our Terms. Users found engaging in
            activities that may constitute an actual or alleged breach of these Terms, such as
            fraudulent communications through automated means, may face immediate account suspension
            or termination at our discretion, without notice or liability.
          </P>
          <P>
            We reserve the right to deactivate, freeze, suspend, or terminate any account in case of
            an actual or alleged breach of these Terms. Please notify us promptly if your
            eligibility to use {companyName} changes or if you suspect any security breaches or
            unauthorized account use.
          </P>
          <P>
            You acknowledge and agree that we may report any activities that we believe may violate
            the law to law enforcement, regulators, or other relevant third parties. Any violation
            of these provisions may result in the immediate termination of your access to our
            Products or Services.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Service Eligibility</Title>
        <Content>
          <P>
            {companyName} encourages parents, legal guardians, and responsible adults to actively
            participate in ensuring the safe use of the Internet by children and minors. Our
            Products and Services are not intended for individuals under the age of eighteen (18).
            If you are below this age, you may only access and use them under the direct supervision
            of your parent or legal guardian. {companyName} does not knowingly collect any
            information from individuals under the age of eighteen (18) and will promptly delete any
            such information.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Prohibited Activities</Title>
        <Content>
          <P>
            As a user, you agree not to engage in, promote, or facilitate the use or access of the
            Site, Products, or Services to:
          </P>
          <Ol>
            <li>Infringe upon these Terms or encourage others to do so.</li>
            <li>
              Plagiarize or infringe upon the intellectual property rights or privacy rights of any
              third party, including breaches of confidence, copyrights, trademarks, patents, trade
              secrets, moral rights, privacy rights, rights of publicity, or any other intellectual
              property or proprietary rights.
            </li>
            <li>
              Distribute, post, or make available any content that: (i) infringes or endangers the
              intellectual property rights of any person; (ii) promotes discrimination, racism,
              harm, libel, hatred, or violence against individuals or groups; (iii) endangers
              children and minors; (iv) is illegal or facilitates illegal activities; (v)
              constitutes a criminal offense or violates any applicable law; and/or (vi) contains
              obscene, sexually explicit, threatening/defamatory, plagiarized, firearms, tobacco,
              alcohol, marijuana, gambling, binary options, Forex, or analogous material.
            </li>
            <li>
              Collect, receive, transfer, or disseminate any personally identifiable information
              without proper consent from the rightful owner.
            </li>
            <li>
              Use any automated or manual process to capture unauthorized data or content from our
              Site, Products, or Services for any purpose.
            </li>
            <li>
              Employ any system, computer program, or technique to extract unauthorized information
              from {companyName}, including the use of persons, site search/retrieval applications,
              software robots, spiders, or similar data gathering and extraction tools.
            </li>
            <li>
              Disseminate computer viruses, worms, defects, trojan horses, or any other destructive
              items through the Site, Products, or Services.
            </li>
            <li>
              Cause an unreasonable load on {companyName}
              {"'"} technology or infrastructure or generate excessive traffic demands without
              authorization.
            </li>
            <li>
              Intercept or monitor activity on our Site, Products, or Services without our express
              permission.
            </li>
            <li>
              Reverse engineer, decompile, or extract the proprietary code of the Site, Products, or
              Services.
            </li>
          </Ol>
        </Content>
      </Panel>
      <Panel>
        <Title>Ownership</Title>
        <Content>
          <P>
            The trademarks, copyrights, service marks, trade names, and other intellectual property
            rights displayed on the Site, Products, or Services belong to {companyName} or its
            licensors or affiliates, whether acknowledged or not. These rights are protected under
            intellectual and proprietary laws in the United States of America and other
            jurisdictions. The respective title holders may or may not be affiliated with us, our
            affiliates, partners, or advertisers. No section of these Terms shall be construed as
            granting you any right, transfer, or interest in {companyName}, the Site, the Products ,
            or the Services, either in whole or in part.
          </P>
          <P>
            For clarification, intellectual property rights refer to patent rights, copyright
            rights, mask work rights, moral rights, rights of publicity, trademark rights, trade
            dress and service mark rights, goodwill, trade secret rights, and any other intellectual
            property rights recognized by laws in Canada and other applicable jurisdictions.
          </P>
          <P>
            You acknowledge and agree that any infringement of copyrighted content on the Site,
            Products, or Services may cause irreparable harm to us, our affiliates, licensors, or
            content providers, which may not be adequately remedied by legal means alone. Therefore,
            our affiliates, licensors, or content providers may seek equitable relief or other
            remedies for breach of these Terms.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Licenses for {companyName}</Title>
        <Content>
          <H3>Limited License</H3>
          <P>
            {companyName} grants you a limited, non-exclusive, revocable, and non-transferable
            license to access and use any purchased Products or Services. You are prohibited from
            duplicating, re-engineering, reverse engineering, modifying, or using our Products or
            Services, whether in whole or in part. This license does not grant you any rights,
            either explicitly or implicitly, to own, use, loan, sell, rent, lease, license,
            sublicense, assign, copy, translate, modify, adapt, improve, create derivative works
            from, display, distribute, perform, or exploit any downloaded software and computer
            applications associated with {companyName}.
          </P>
          <H3>User Generated Content License</H3>
          <P>
            By uploading, disseminating, delivering, creating, or transferring any content to{" "}
            {companyName} through the Site, the Products, or the Services, you grant {companyName}{" "}
            an unlimited, non-exclusive, sublicensable, assignable, royalty-free, perpetual,
            irrevocable, worldwide license to use, host, store, reproduce, modify, create derivative
            works, communicate, publish, publicly perform, publicly display, and distribute such
            content. This license covers any posts, original audio files, messages, chats, uploaded
            files, data inputs, emails, or any other content you deliver to {companyName}. By
            submitting content, you represent and warrant that you have the necessary rights or
            authorizations to do so.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Representations and Warranties</Title>
        <Content>
          <P>
            You hereby declare, ensure, and promise that: (i) your utilization of our Site, Products
            and Services, as well as all the data you upload and use, shall at all times comply with
            these Terms and all applicable local, state, federal, and international laws and
            regulations pertaining to you and your organization; and (ii) you have obtained all
            necessary rights, releases, and permissions to provide any data to {companyName} and its
            affiliates, licensors, and agents, and to grant the rights granted to {companyName} in
            these Terms, including, without limitation, any intellectual property rights, rights of
            privacy, or rights of publicity, and any use, collection, and disclosure authorized
            herein is not inconsistent with the terms of any applicable privacy policies.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Term, Termination</Title>
        <Content>
          <P>
            The term hereof shall commence on the earliest of the following dates: (i) the first
            access to the Site; (ii) your first access or execution of any Products or Services; or
            (iii) {companyName} commences providing its Services to you.
          </P>
          <P>
            The term hereof will automatically terminate on the earlier of: (i) the deactivation,
            suspension, freezing, or deletion of any Products or Services associated with your
            account; (ii) the termination or revocation of your access to our Services or Products;
            (iii) {companyName}
            {"'"}s termination of these Terms, at its sole and final discretion; (iv) the
            termination date communicated by {companyName} to you from time to time; or (v){" "}
            {companyName}
            {"'"}s decision to no longer make the Site, the Products, or the Services available for
            use, at its sole and final discretion.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Termination by you Without Cause</Title>
        <Content>
          <P>
            You may terminate your subscription at any time by permanently rendering inaccessible
            any downloaded software and computer applications to which you have access.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Termination for Cause by {companyName}</Title>
        <Content>
          <P>
            These Terms, along with any licenses granted hereunder, may or will automatically
            terminate if you breach any of the terms and conditions stated herein. Upon termination
            due to breach, your rights to use our Site, Products, or Services, and any information
            provided or generated thereby, shall cease, and you shall not be entitled to any
            compensation, credit, remedy, or refund of any nature.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Third Party Links</Title>
        <Content>
          <P>
            The Site, the Products, and the Services may contain hyperlinks to other websites. These
            links are provided for your personal convenience and to provide you with further
            information that may be of interest to you. The provision of such links does not imply
            any endorsement of such third-party websites, products, or services.
          </P>
          <P>
            From time to time, we may display ads and promotions from third-party sources on the
            Site, the Products, and/or the Services. Accordingly, your participation or engagement
            in promotions of third parties other than {companyName}, and any terms, conditions,
            warranties, or representations associated with such engagements, are solely between you
            and such third party. {companyName} is not responsible or liable for any loss or damage
            of any kind incurred as a result of any such dealings or as a result of the presence of
            third-party advertisers.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>User Privacy</Title>
        <Content>
          <P>
            By providing us with any data or personally identifiable information, you agree to our
            Policy, which includes the collection, processing, storage, and disclosure of such
            information to our affiliates, partners, and clients, except for selling purposes. We
            will request your express consent, including for inclusion in our newsletters, updates,
            and follow-ups. For more information, please read our Policy.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>No Warranty</Title>
        <Content>
          <P>
            Neither {companyName}, nor its affiliates, subsidiaries, officers, employees, and agents
            guarantee that the Site, the Products, or the Services will be error-free,
            uninterrupted, secure, or produce any specific results. No advice or information
            provided by {companyName} or its employees, affiliates, contractors, and/or agents
            creates a guarantee. The Site, the Products, and the Services have not been fully tested
            in all situations or devices, and they may or will contain operational malfunctions,
            errors, viruses, bugs, worms, Trojan horses, bots, and other harmful and destructive
            components or defects.
          </P>
          <P>
            To the fullest extent permitted by applicable law, the Site, the Products, and the
            Services are provided to you <Q>as is</Q>, with <Q>all faults</Q> and{" "}
            <Q>as available</Q>, without warranty of any kind, without performance assurances or
            guarantees of any kind, and your use is at your sole risk. No oral or written advice
            provided by {companyName}, its affiliates, clients, agents, officers, licensors,
            distributors, and/or any authorized representative creates any implied warranty, nor
            will they be responsible for any actions or omissions on your part regarding the use of
            the Products and Services, such as incorrect input, format or backup of data and
            metadata, lost data, or corrupted data.
          </P>
          <P>
            The entire risk of satisfactory quality and performance resides with you. {companyName},
            and its affiliates, clients, agents, officers, licensors, and/or distributors do not
            make, and hereby disclaim, any and all express, implied, or statutory warranties, either
            by statute, common law, custom, usage of trade, course of dealing, or otherwise, however
            arising, including implied warranties of description, quality, fitness for a particular
            purpose, operation, integration, adequacy, suitability, title, non-infringement,
            non-interference with use and/or enjoyment.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Disclaimer of Damages</Title>
        <Content>
          <P>
            In no event shall {companyName}, its affiliates, clients, agents, officers, licensors,
            distributors, and/or any authorized third party be held liable for any special,
            indirect, incidental, or consequential damages, including losses, costs, or expenses of
            any kind resulting from possession, access, use, or malfunction of the Site, the
            Products, or the Services, including but not limited to loss of revenue, profits,
            business, loss of use, or lack of availability of computer resources, arising out of or
            related thereto, whether arising in tort (including negligence), contract, strict
            liability, or other legal or equitable theory, and whether or not {companyName}, its
            affiliates, clients, licensors, and/or distributors have been advised of the possibility
            of such damages.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Limitation of Liability</Title>
        <Content>
          <P>
            In no event shall {companyName} , or its affiliates , clients , licensors , and/or
            distributors liability for all damages (except as required by applicable law) exceed the
            amount of CAD100.00; and any award for direct, provable damages shall not exceed such
            total amount.
          </P>
          <P>
            These Terms grant you specific legal rights, and you may have additional rights that
            vary by jurisdiction. In jurisdictions where certain limitations of liability are not
            allowed by legislation, the fullest extent permitted by law in that jurisdiction shall
            apply. For the purpose of this limitation of liability, {companyName}, its affiliates,
            licensors, and distributors are third-party beneficiaries and may enforce these Terms
            against you.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Indemnification</Title>
        <Content>
          <P>
            By agreeing to these Terms, you acknowledge and agree to indemnify, hold harmless, and
            defend {companyName}, its affiliates, clients, agents, officers, licensors,
            distributors, and authorized representatives (collectively referred to as{" "}
            <Q>{companyName} Indemnitee</Q>) from any third-party liabilities, claims, suits,
            losses, damages, fines, judgments, settlements, and expenses, including reasonable
            attorney{"'"}s fees and court costs, incurred by any {companyName} Indemnitee arising
            from (i) your breach of warranties, representations, and covenants made under these
            Terms (to the extent not resulting substantially from any breach by {companyName})
            and/or (ii) any third-party claim related to the Site, the Products, or the Services or
            their use in conjunction with your business platform, including claims of violation,
            infringement, or misappropriation of any third-party proprietary or intellectual
            property rights, including privacy rights.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>
          Events outside of {companyName}
          {"'"}s Control.
        </Title>
        <Content>
          <P>
            {companyName} shall not be held responsible or liable for any failure or delay in the
            performance of its obligations under these Terms caused by forces beyond its control,
            including but not limited to strikes, work stoppages, accidents, acts of war or
            terrorism, civil or military disturbances, nuclear or natural catastrophes, acts of God,
            force majeure events, interruptions, loss, or malfunctions of utilities, communications,
            or computer services (software and hardware). However, {companyName} will make
            reasonable commercial efforts consistent with industry practices to resume performance
            as soon as practicable under the circumstances.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Governing Language</Title>
        <Content>
          <P>
            From time to time, our Terms may be translated into other languages for your
            convenience. However, the English language version of these documents shall prevail and
            govern your use of our Products, Site, or Services. In the event of any conflict between
            the English language version and any translated version, the English language version
            will prevail.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>General</Title>
        <Content>
          <H3>Assignment</H3>
          <P>These Terms shall benefit any successors of the parties.</P>
          <H3>Content Moderation</H3>
          <P>
            {companyName} reserves the right, at its sole discretion, to review all content
            submitted to {companyName} and use moderators or monitoring technology to flag and
            remove any inappropriate user-generated content or other content.
          </P>
          <H3>Entire Agreement</H3>
          <P>
            These Terms constitute the entire agreement between the parties and may only be altered
            or amended in writing by both parties.
          </P>
          <H3>Equitable Remedies</H3>
          <P>
            You acknowledge and agree that if these Terms are not specifically enforced,{" "}
            {companyName} will be irreparably harmed. Therefore, in addition to any other available
            remedies, {companyName} shall be entitled to appropriate equitable remedies for your
            breach of these Terms, without the need for bond, other security, or proof of damages.
          </P>
          <H3>Newsletters</H3>
          <P>
            The Site may offer a newsletter service, which may be provided by {companyName} or an
            authorized third party. As a subscriber, you will receive information based on your
            preferences. You will receive a conspicuous communication indicating your subscription,
            and you can manage the type and frequency of emails. To unsubscribe, you will find an{" "}
            <Q>unsubscribe</Q> link or similar options in our communications.
          </P>
          <H3>No Waiver</H3>
          <P>
            Failure by {companyName} to enforce any rights under these Terms shall not be construed
            as a waiver of such rights.
          </P>
          <H3>No Relationship</H3>
          <P>
            You and {companyName} are independent contractors, and no agency, partnership, joint
            venture, employee-employer, or franchiser-franchisee relationship is intended or created
            by these Terms.
          </P>
          <H3>Notices</H3>
          <P>
            All notices and communications pursuant to these Terms must be in writing and will be
            deemed given upon the earlier of actual receipt or: (a) personal delivery, (b) when sent
            by facsimile or electronic mail during normal business hours, or (c) five days after
            being sent by registered or certified mail, return receipt requested, or (d) one
            business day after deposit with a nationally recognized overnight courier.
            Communications should be sent to the respective party{"'"}s address, facsimile number,
            or electronic mail address as subsequently indicated by each party. Both parties agree
            to receive electronic documents and accept electronic signatures as valid substitutes
            for hardcopy documents and hand-inked signatures.
          </P>
          <H3>Severability</H3>
          <P>
            If any provision of these Terms is held unenforceable, the provision will be modified to
            reflect the parties{"'"} intention, and all remaining provisions will remain in full
            force and effect.
          </P>
          <H3>Taxes</H3>
          <P>
            You are responsible for complying with all tax obligations associated with your account.
            It is important to maintain complete and accurate contact details for invoice
            remittance, especially payment processing account details.
          </P>
          <H3>No Waiver</H3>
          <P>
            Failure by {companyName} to enforce any rights under these Terms shall not be construed
            as a waiver of such rights.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Applicable Law, Waiver, Dispute Resolution</Title>
        <Content>
          <H3>Waiver of Class Actions, Non-Individualized Relief</H3>
          <P>
            You acknowledge and accept that claims against {companyName} shall only be pursued on an
            individual basis and not as part of any class or representative action. Unless otherwise
            agreed, you may not join or consolidate claims with others, nor supervise or participate
            in any representative or consolidated proceeding.
          </P>
          <H3>Waiver of Jury Trial</H3>
          <P>
            The parties herein waive their constitutional and statutory rights to go to court and
            have a trial in front of a judge or a jury, instead electing that all claims and
            disputes be resolved by a competent judge.
          </P>
          <H3>Applicable Law</H3>
          <P>
            Your use of this Site and any legal action, claim, or dispute that may arise between the
            parties shall be governed by the laws of the Province where {companyName} Inc. operates
            in Canada, without considering conflicts of law principles.
          </P>
        </Content>
      </Panel>
      <Panel>
        <Title>Contact</Title>
        <Content>
          <P>
            If you have any inquiries or concerns regarding us, the Site, the Products, our
            Services, or these Terms, please reach out to us using the contact information provided
            on our contact page:{" "}
            <a href={`${url}/contact`} className="font-medium underline">
              {url}/contact
            </a>
            .
          </P>
        </Content>
      </Panel>
    </Accordion>
  </section>
)
export default Terms

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<LayoutProps> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return { props: { session: null } satisfies LayoutProps }

  const accountList = (await db.query.accounts.findMany({
    columns: { companyName: true, id: true },
    where: and(isNotNull(accounts.companyName), eq(accounts.userId, session.user.id)),
  })) as { companyName: string; id: string }[]

  if (session.accountId === null && accountList.length > 0) {
    await db
      .update(sessions)
      .set({ accountId: accountList[0].id })
      .where(eq(sessions.userId, session.user.id))
    session.accountId = accountList[0].id
  }

  if (accountList.length > 0)
    return {
      props: {
        session,
        companies: accountList,
        selectedAccountId: session.accountId as string,
      } satisfies LayoutProps,
    }
  else
    return {
      props: {
        session,
      } satisfies LayoutProps,
    }
}
