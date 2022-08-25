{
  description = "Kubernetes env injector";

  inputs = {
    hotPot.url = "github:shopstic/nix-hot-pot";
    nixpkgs.follows = "hotPot/nixpkgs";
    flakeUtils.follows = "hotPot/flakeUtils";
  };

  outputs = { self, nixpkgs, flakeUtils, hotPot }:
    flakeUtils.lib.eachSystem [ "aarch64-darwin" "aarch64-linux" "x86_64-linux" ]
      (system:
        let
          pkgs = import nixpkgs { inherit system; };
          hotPotPkgs = hotPot.packages.${system};
          deno = hotPotPkgs.deno;
          kubectl = pkgs.kubectl;
          k8sEnvInjector = pkgs.callPackage hotPot.lib.denoAppBuild {
            inherit deno;
            name = "k8s-env-injector";
            src = builtins.path
              {
                path = ./.;
                name = "k8s-env-injector-src";
                filter = with pkgs.lib; (path: /* type */_:
                  hasInfix "/src" path ||
                  hasSuffix "/lock.json" path
                );
              };
            appSrcPath = "./src/app.ts";
          };
          vscodeSettings = pkgs.writeTextFile {
            name = "vscode-settings.json";
            text = builtins.toJSON {
              "deno.enable" = true;
              "deno.lint" = true;
              "deno.unstable" = true;
              "deno.path" = deno + "/bin/deno";
              "deno.suggest.imports.hosts" = {
                "https://deno.land" = false;
              };
              "editor.tabSize" = 2;
              "[typescript]" = {
                "editor.defaultFormatter" = "denoland.vscode-deno";
                "editor.formatOnSave" = true;
              };
              "yaml.schemaStore.enable" = true;
              "yaml.schemas" = {
                "https://json.schemastore.org/github-workflow.json" = ".github/workflows/*.yaml";
              };
              "nix.enableLanguageServer" = true;
              "nix.formatterPath" = pkgs.nixpkgs-fmt + "/bin/nixpkgs-fmt";
              "nix.serverPath" = pkgs.rnix-lsp + "/bin/rnix-lsp";
            };
          };
        in
        rec {
          defaultPackage = k8sEnvInjector;
          packages = pkgs.lib.optionalAttrs pkgs.stdenv.isLinux {
            appImage = pkgs.callPackage ./images/app {
              inherit deno kubectl k8sEnvInjector;
              inherit (pkgs) dumb-init;
              buildahBuild = pkgs.callPackage hotPot.lib.buildahBuild;
            };
            initImage = pkgs.callPackage ./images/init {
              inherit kubectl;
              inherit (pkgs) openssl;
              buildahBuild = pkgs.callPackage hotPot.lib.buildahBuild;
            };
          };
          devShell = pkgs.mkShellNoCC {
            shellHook = ''
              mkdir -p ./.vscode
              cat ${vscodeSettings} > ./.vscode/settings.json
            '';
            buildInputs = builtins.attrValues {
              inherit deno kubectl;
              inherit (hotPotPkgs)
                manifest-tool
                ;
              inherit (pkgs)
                skopeo
                yq-go
                kubernetes-helm
                awscli2
                ;
            };
          };
        }
      );
}
