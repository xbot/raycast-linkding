import { Action, ActionPanel, Form, List, Icon, useNavigation, confirmAlert } from "@raycast/api";
import { LinkdingAccountForm, LinkdingAccountMap } from "./types/index";
import { useEffect, useState } from "react";
import { getPersistedLinkdingAccounts, setPersistedLinkdingAccounts } from "./services/account";
import { validateUrl } from "./utils/index";
import { LinkdingShortcut } from "./types/shortcuts";
import _ from "lodash";

export default function ManageAccounts() {
  const [linkdingAccountMap, setLinkdingAccountMap] = useState<LinkdingAccountMap>({});
  const [searchText, setSearchText] = useState("");
  const [hasAccounts, setHasAccounts] = useState(false);
  const { push } = useNavigation();
  useEffect(() => {
    getPersistedLinkdingAccounts().then((linkdingMap) => {
      if (linkdingMap) {
        setHasAccounts(!_.isEmpty(linkdingMap));
        const searchedLinkdingAccounts = Object.keys(linkdingMap)
          .filter((account) => searchText === "" || account.includes(searchText))
          .reduce((prev, account) => ({ ...prev, [account]: linkdingMap[account] }), {});
        setLinkdingAccountMap(searchedLinkdingAccounts);
      }
    });
  }, [setLinkdingAccountMap, searchText]);

  function deleteAccount(name: string): void {
    confirmAlert({
      title: "Confirm Delete",
      message: "Are you sure you want to delete this account?",
      primaryAction: {
        title: "Delete",
        onAction: () => {
          const { [name]: removed, ...filteredMapEntries } = linkdingAccountMap;
          updateLinkdingAccountMap(filteredMapEntries);
        },
      },
    })
  }

  function createUpdateAccount(account: LinkdingAccountForm): void {
    const { name, ...linkdingServer } = account;
    if (name) {
      const accounts = { ...linkdingAccountMap, [name]: { ...linkdingServer } };
      updateLinkdingAccountMap(accounts);
    }
  }

  function updateLinkdingAccountMap(linkdingMap: LinkdingAccountMap) {
    setLinkdingAccountMap(linkdingMap);
    setPersistedLinkdingAccounts(linkdingMap);
  }

  function showCreateEditAccount(formValue?: LinkdingAccountForm) {
    push(
      <CreateEditAccount
        initialValue={formValue}
        linkdingAccountMap={linkdingAccountMap}
        onSubmit={(formValue) => createUpdateAccount(formValue)}
      />
    );
  }

  return (
    <List
      navigationTitle="Manage Linkding Accounts"
      searchBarPlaceholder="Search through Accounts..."
      onSearchTextChange={setSearchText}
      throttle
      actions={
        <ActionPanel title="Manage Accounts">
          <Action title="Create New Account" icon={{ source: Icon.Plus }} onAction={() => showCreateEditAccount()} />
        </ActionPanel>
      }
    >
      {Object.keys(linkdingAccountMap).length == 0 && !hasAccounts ? (
        <List.EmptyView
          title="Your Linkding Account is not set up yet."
          description="Here, you can create your first account."
        />
      ) : (
        Object.entries(linkdingAccountMap).map(([name, linkdingAccount]) => {
          return (
            <List.Item
              key={name}
              title={name}
              subtitle={linkdingAccount.serverUrl}
              actions={
                <ActionPanel title="Manage Accounts">
                  <Action title="Create Account" icon={{ source: Icon.Plus }} onAction={() => showCreateEditAccount()} />
                  <Action title="Edit Account" icon={{ source: Icon.Pencil }} onAction={() => showCreateEditAccount({ name, ...linkdingAccount })} />
                  <Action
                    title="Delete Account"
                    icon={{ source: Icon.Trash }}
                    shortcut={LinkdingShortcut.DELETE_SHORTCUT}
                    onAction={() => deleteAccount(name)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function CreateEditAccount({
  initialValue,
  onSubmit,
  linkdingAccountMap,
}: {
  initialValue?: LinkdingAccountForm;
  onSubmit: (formValue: LinkdingAccountForm) => void;
  linkdingAccountMap: LinkdingAccountMap;
}) {
  const { pop } = useNavigation();

  const [accountNameError, setAccountNameError] = useState<string | undefined>();
  const [serverUrlError, setServerUrlError] = useState<string | undefined>();
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();

  function submitForm(formValues: LinkdingAccountForm): void {
    onSubmit({
      name: formValues.name?.trim() ?? initialValue?.name,
      apiKey: formValues.apiKey.trim(),
      serverUrl: formValues.serverUrl.trim(),
      ignoreSSL: formValues.ignoreSSL,
    });
    pop();
  }

  function validateAccountname(value?: string) {
    if (value) {
      if (Object.keys(linkdingAccountMap).includes(value)) {
        setAccountNameError("Name already used");
      }
    } else {
      setAccountNameError("Name is required");
    }
  }

  function dropAccountNameError() {
    setAccountNameError(undefined);
  }

  function validateServerUrl(value?: string) {
    if (value) {
      if (!validateUrl(value)) {
        setServerUrlError("Server URL must be a valide url");
      }
    } else {
      setServerUrlError("Server URL is required");
    }
  }

  function dropServerUrlError() {
    setServerUrlError(undefined);
  }

  function validateApiKey(value?: string) {
    if (!value) {
      setApiKeyError("API Key is required");
    }
  }

  function dropApiKeyError() {
    setApiKeyError(undefined);
  }

  return (
    <Form
      navigationTitle={initialValue ? `Edit Linkding "${initialValue.name}" Account` : "Create new Linkding Account"}
      actions={
        <ActionPanel title="Manage Accounts">
          <Action.SubmitForm
            title={initialValue ? "Edit Account" : "Create Account"}
            onSubmit={(values: LinkdingAccountForm) => submitForm(values)}
          />
        </ActionPanel>
      }
    >
      {initialValue?.name ? (
        <Form.Description title="Accountname" text="Accountname cant be changed" />
      ) : (
        <Form.TextField
          defaultValue={initialValue?.name}
          id="name"
          error={accountNameError}
          onBlur={(event) => validateAccountname(event.target.value)}
          onChange={dropAccountNameError}
          title="Account Name"
          placeholder="A Name for the Account"
        />
      )}
      <Form.TextField
        defaultValue={initialValue?.serverUrl}
        id="serverUrl"
        error={serverUrlError}
        onBlur={(event) => validateServerUrl(event.target.value)}
        onChange={dropServerUrlError}
        title="Linkding Server URL"
        placeholder="URL from the Linkding instance"
      />
      <Form.PasswordField
        defaultValue={initialValue?.apiKey}
        id="apiKey"
        error={apiKeyError}
        onBlur={(event) => validateApiKey(event.target.value)}
        onChange={dropApiKeyError}
        title="Linkding API Key"
        placeholder="API Key from from the Linkding instance"
      />
      <Form.Checkbox
        defaultValue={initialValue?.ignoreSSL}
        id="ignoreSSL"
        title="Ignore Server SSL"
        label="Ignore SSL Certificate from Linkding Server"
      />
    </Form>
  );
}
