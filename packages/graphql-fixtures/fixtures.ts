import { addMocksToSchema, IMocks, type IMockStore } from "@graphql-tools/mock";
import {
  type IExecutableSchemaDefinition,
  makeExecutableSchema,
} from "@graphql-tools/schema";
import {
  IResolvers,
  isDocumentNode,
  type TypeSource,
} from "@graphql-tools/utils";
import { graphql, type GraphQLSchema, isSchema } from "graphql";
import gql from "graphql-tag";

export function schemaTypeDefs(schema: unknown): TypeSource {
  if (isSchema(schema)) return schema;
  if (isDocumentNode(schema)) return schema;
  if (typeof schema === "string") return gql(schema);

  throw new Error("Invalid schema type");
}

export function loadSchema(
  schema: unknown,
  options?: Omit<IExecutableSchemaDefinition, "typeDefs">
): GraphQLSchema {
  if (isSchema(schema)) return schema;

  return makeExecutableSchema({ typeDefs: schemaTypeDefs(schema), ...options });
}

type MockMocks<TResolvers = IResolvers> = IMocks<TResolvers>;
type MockResolvers<TResolvers = IResolvers> =
  | Partial<TResolvers>
  | ((store: IMockStore) => Partial<TResolvers>);

export interface MockServerOptions<
  TResolvers,
  TMockMocks extends MockMocks<TResolvers>,
  TMockResolvers extends MockResolvers<TResolvers>,
> {
  store?: IMockStore;
  mocks?: TMockMocks;
  resolvers?: TMockResolvers;
  context?: Record<string, unknown>;
  root?: Record<string, unknown>;
}

export function mockServer<
  TResolvers = IResolvers,
  TMockMocks extends MockMocks<TResolvers> = MockMocks<TResolvers>,
  TMockResolvers extends MockResolvers<TResolvers> = MockResolvers<TResolvers>,
>(
  schema: GraphQLSchema,
  {
    store,
    mocks = {} as TMockMocks,
    resolvers = {} as TMockResolvers,
    context,
    root,
  }: MockServerOptions<TResolvers, TMockMocks, TMockResolvers> = {}
) {
  const schemaWithMocks = addMocksToSchema<any>({
    schema,
    store,
    mocks,
    resolvers,
  });

  return {
    store,
    mocks,
    resolvers,
    query: (query: string, vars?: Record<string, unknown>) => {
      return graphql({
        schema: schemaWithMocks,
        source: query,
        variableValues: vars,
        rootValue: root,
        contextValue: context,
      });
    },
  };
}

export type MockServer<
  TResolvers = IResolvers,
  TMockMocks extends MockMocks<TResolvers> = MockMocks<TResolvers>,
  TMockResolvers extends MockResolvers<TResolvers> = MockResolvers<TResolvers>,
> = ReturnType<typeof mockServer<TResolvers, TMockMocks, TMockResolvers>>;
