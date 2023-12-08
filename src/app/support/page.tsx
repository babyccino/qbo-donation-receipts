import { Button } from "flowbite-react/lib/esm/components/Button"

import { TextArea, TextInput } from "@/components/form-server"
import { supportRequest } from "./action"

export default function Support() {
  return (
    <section>
      <div className="mx-auto max-w-screen-md px-4 py-8 lg:py-16">
        <h2 className="mb-4 text-center text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Contact Us
        </h2>
        <p className="mb-8 text-center font-light text-gray-500 dark:text-gray-400 sm:text-xl lg:mb-16">
          Got a technical issue? Want to send feedback? Let us know.
        </p>
        <form action={supportRequest}>
          <TextInput
            id="from"
            type="email"
            label="Your email"
            placeholder="name@email.com"
            minLength={5}
            required
          />
          <TextInput
            id="subject"
            label="Subject"
            placeholder="Let us know how we can help you"
            minLength={5}
            required
          />
          <TextArea
            id="body"
            label="Leave a comment"
            placeholder="Leave a comment..."
            minLength={5}
            rows={6}
            required
          />
          <Button
            type="submit"
            className="bg-primary-700 hover:bg-primary-800 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
          >
            Send message
          </Button>
        </form>
      </div>
    </section>
  )
}
