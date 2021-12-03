{
  description = "Kubernetes env injector";

  inputs = {
    hotPot.url = "github:shopstic/nix-hot-pot";
    nixpkgs.follows = "hotPot/nixpkgs";
    flakeUtils.follows = "hotPot/flakeUtils";
  };

  outputs = { self, nixpkgs, flakeUtils, hotPot }:
    flakeUtils.lib.eachSystem [ "aarch64-darwin" "aarch64-linux" "x86_64-darwin" "x86_64-linux" ]
      (system:
        let
          pkgs = import nixpkgs { inherit system; };
          hotPotPkgs = hotPot.packages.${system};
          deno = hotPotPkgs.deno_1_13_x;
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
