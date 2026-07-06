import { AddressText } from "../../components/ui/AddressText";
import { Panel } from "../../components/ui/Panel";
import type { StatusResponse } from "../../lib/api/types";

type ContractBindingsPanelProps = {
  status?: StatusResponse;
};

export function ContractBindingsPanel({ status }: ContractBindingsPanelProps) {
  const rows = [
    {
      name: "IoT Registry",
      role: "Device identity and bitmask attributes",
      value: status?.contractAddresses.registry,
    },
    {
      name: "Revocation",
      role: "Sparse Mapping and Sequential BitMap revocation state",
      value: status?.contractAddresses.revocation,
    },
    {
      name: "Access Control",
      role: "Contract-backed verifyAccess path",
      value: status?.contractAddresses.accessControl,
    },
  ];

  return (
    <Panel title="Contract bindings" description="Deployed addresses reported by the middleware.">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Contract</th>
              <th scope="col">Role</th>
              <th scope="col">Address</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>
                  <strong>{row.name}</strong>
                </td>
                <td>{row.role}</td>
                <td>
                  <AddressText value={row.value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
