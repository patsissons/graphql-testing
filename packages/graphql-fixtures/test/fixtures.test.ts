import * as casual from "casual";
import gql from "graphql-tag";
import { loadSchema, mockServer } from "../fixtures";

describe("graphql-fixtures", () => {
  const typeDefs = gql`
    type Query {
      test(id: ID!): Test
      testDetails(id: ID!): TestDetails
    }

    type Test {
      id: ID!
      name: String!
      details: TestDetails
    }

    type TestDetails {
      id: ID!
      metadata: String!
    }
  `;

  const schema = loadSchema(typeDefs);

  it("can query the schema", async () => {
    const graphql = mockServer(schema);

    const result = await graphql.query(`{test(id: "${casual.uuid}") { id } }`);
    expect(result).toMatchObject({
      data: { test: { id: expect.any(String) } },
    });
  });

  it("can query the schema with default type mocks", async () => {
    const graphql = mockServer(schema, { mocks: { ID: () => "123" } });

    const result = await graphql.query(`{test(id: "${casual.uuid}") { id } }`);
    expect(result).toMatchObject({
      data: { test: { id: "123" } },
    });
  });

  it("can query the schema with custom type mocks", async () => {
    const graphql = mockServer(schema, {
      mocks: { Test: () => ({ name: "test mock" }) },
    });

    const result = await graphql.query(
      `{test(id: "${casual.uuid}") { id, name } }`
    );
    expect(result).toMatchObject({
      data: { test: { id: expect.any(String), name: "test mock" } },
    });
  });

  it("can query the schema with field mocks", async () => {
    const mockId = casual.uuid;
    const mockName = "test resolver mock";
    const graphql = mockServer(schema, {
      mocks: {
        Query: {
          test: ({ id }) => ({
            id,
            name: mockName,
          }),
        },
      },
    });

    const result = await graphql.query(`{test(id: "${mockId}") { id, name } }`);
    expect(result).toMatchObject({
      data: { test: { id: mockId, name: mockName } },
    });
  });

  it("can query the schema with field resolver mocks", async () => {
    const mockId = casual.uuid;
    const mockName = "test resolver mock";
    const graphql = mockServer(schema, {
      resolvers: {
        Query: {
          test: (_, { id }) => ({
            id,
            name: mockName,
          }),
        },
      },
    });

    const result = await graphql.query(`{test(id: "${mockId}") { id, name } }`);
    expect(result).toMatchObject({
      data: { test: { id: mockId, name: mockName } },
    });
  });

  it("can query the schema with both type mocks and resolver mocks", async () => {
    const mockId = "456";
    const mockName = "test resolver mock";
    const graphql = mockServer(schema, {
      mocks: {
        ID: () => mockId,
      },
      resolvers: {
        Query: {
          test: () => ({
            name: mockName,
          }),
        },
      },
    });

    const result = await graphql.query(
      `{test(id: "123") { id, name, details { id, metadata } } }`
    );
    expect(result).toMatchObject({
      data: {
        test: {
          id: mockId,
          name: mockName,
          details: { id: mockId, metadata: expect.any(String) },
        },
      },
    });
  });

  it("can query the schema with variables", async () => {
    const mockId = casual.uuid;
    const graphql = mockServer(schema, {
      mocks: {
        Query: {
          test: ({ id }) => ({ id }),
        },
      },
    });

    const result = await graphql.query(
      `query TestQuery($id: ID!) {test(id: $id) { id } }`,
      { id: mockId }
    );
    expect(result).toMatchObject({
      data: { test: { id: mockId } },
    });
  });

  it("can assert query field operations using custom resolvers", async () => {
    const operationName = "TestQuery";
    const mockRoot = { root: "root" };
    const mockContext = { context: "context" };
    const mockId = casual.uuid;
    const graphql = mockServer(schema, {
      resolvers: {
        Query: {
          test: jest.fn(() => ({})),
        },
      },
      root: mockRoot,
      context: mockContext,
    });
    await graphql.query(
      `query ${operationName} {test(id: "${mockId}") { id } }`
    );
    expect(graphql.resolvers.Query.test).toHaveBeenCalledWith(
      mockRoot,
      { id: mockId },
      mockContext,
      expect.objectContaining({
        operation: expect.objectContaining({
          operation: "query",
          name: expect.objectContaining({
            kind: "Name",
            value: operationName,
          }),
        }),
      })
    );
  });
});
