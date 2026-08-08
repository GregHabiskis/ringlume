export function getServerEnvironmentVariable(
	name: string,
): string | undefined {
	return process.env[name];
}
