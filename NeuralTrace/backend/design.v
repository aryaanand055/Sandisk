// multi_channel_dma.v
// Realistic DMA Controller for Neural Trace Impact Analysis Demonstration

module dma_arbiter (
    input clk,
    input rst_n,
    input [3:0] req,
    output reg [3:0] gnt
);
    reg [1:0] last_gnt;
    
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            gnt <= 4'b0000;
            last_gnt <= 2'b00;
        end else begin
            case (last_gnt)
                2'b00: if (req[1]) gnt <= 4'b0010; else if (req[2]) gnt <= 4'b0100; else if (req[3]) gnt <= 4'b1000; else if (req[0]) gnt <= 4'b0001;
                2'b01: if (req[2]) gnt <= 4'b0100; else if (req[3]) gnt <= 4'b1000; else if (req[0]) gnt <= 4'b0001; else if (req[1]) gnt <= 4'b0010;
                2'b10: if (req[3]) gnt <= 4'b1000; else if (req[0]) gnt <= 4'b0001; else if (req[1]) gnt <= 4'b0010; else if (req[2]) gnt <= 4'b0100;
                2'b11: if (req[0]) gnt <= 4'b0001; else if (req[1]) gnt <= 4'b0010; else if (req[2]) gnt <= 4'b0100; else if (req[3]) gnt <= 4'b1000;
            endcase
            if (|gnt) last_gnt <= (gnt[0]) ? 2'b00 : (gnt[1]) ? 2'b01 : (gnt[2]) ? 2'b10 : 2'b11;
        end
    end
endmodule

module dma_channel (
    input clk,
    input rst_n,
    input start,
    input [31:0] src_addr,
    input [31:0] dest_addr,
    input [15:0] length,
    output reg busy,
    output reg [31:0] current_addr,
    output reg done
);
    reg [15:0] count;
    
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            busy <= 0;
            done <= 0;
            count <= 0;
            current_addr <= 0;
        end else if (start && !busy) begin
            busy <= 1;
            done <= 0;
            count <= length;
            current_addr <= src_addr;
        end else if (busy) begin
            if (count > 0) begin
                count <= count - 1;
                current_addr <= current_addr + 4;
            end else begin
                busy <= 0;
                done <= 1;
            end
        end else begin
            done <= 0;
        end
    end
endmodule

module main_dma_controller (
    input clk,
    input rst_n,
    input [3:0] channel_start,
    input [31:0] cfg_data,
    input [1:0] cfg_channel_select,
    output [3:0] channel_busy,
    output [3:0] channel_done
);
    wire [3:0] arb_gnt;
    wire [3:0] arb_req = channel_start;
    
    dma_arbiter arb (
        .clk(clk),
        .rst_n(rst_n),
        .req(arb_req),
        .gnt(arb_gnt)
    );
    
    genvar i;
    generate
        for (i=0; i<4; i=i+1) begin : channels
            dma_channel ch (
                .clk(clk),
                .rst_n(rst_n),
                .start(arb_gnt[i]),
                .src_addr(cfg_data), // Simplified mapping
                .dest_addr(32'h00000000),
                .length(16'h00FF),
                .busy(channel_busy[i]),
                .current_addr(),
                .done(channel_done[i])
            );
        end
    endgenerate
endmodule
